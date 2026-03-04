/* eslint-env node */
import Anthropic from '@anthropic-ai/sdk';

// Using default Node.js runtime for maximum compatibility

const TRANSLATION_SYSTEM_PROMPT = `You are an expert scholar of classical Jewish texts with deep knowledge of Biblical Hebrew, Mishnaic Hebrew, Talmudic Aramaic (Babylonian and Jerusalem dialects), and the Aramaic of the Zohar.

Your task is to translate the provided Hebrew or Aramaic text into clear, scholarly English suitable for a Jewish educator's source sheet.

CRITICAL INSTRUCTIONS:
1. First, identify the primary language of the text: Biblical Hebrew, Mishnaic Hebrew, Talmudic Aramaic, Zoharic Aramaic, or mixed.
2. If the text is primarily Aramaic (Talmudic/Zoharic), set "isAramaic": true and note this explicitly in translation.
3. For difficult, ambiguous, or uncertain passages, add a bracketed note: [Translator's note: uncertain — possible meaning: X]
4. Do NOT invent a translation when the text is genuinely unclear. Use "[unclear passage]" for untranslatable segments.
5. Preserve proper nouns, divine names, and technical halakhic terms in transliteration when appropriate (e.g., "Shabbat," "mitzvah," "teshuvah").
6. Match the register of the original: legal texts should sound precise, narrative should sound literary, mystical texts should preserve their elevated style.

RESPONSE FORMAT: Respond ONLY with valid JSON in exactly this structure:
{
  "translation": "<the full English translation>",
  "isAramaic": <true if primarily Aramaic, false if primarily Hebrew>,
  "confidence": "<high if straightforward text, medium if some ambiguity, low if significant uncertainty>",
  "languageNote": "<optional: brief note on language, e.g., 'Babylonian Talmudic Aramaic with some Hebrew terms'>"
}`;

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // tighter than chat (20) — translation is expensive

function isRateLimited(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        // New window
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return false;
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }

    record.count++;
    return false;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting check
    const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIP)) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
    }

    let body = req.body;
    // Sometimes body is a string (if content-type isn't perfectly matched or config setting)
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
    }

    const { ref, hebrewText } = body || {};
    if (!hebrewText || typeof hebrewText !== 'string' || !hebrewText.trim()) {
        return res.status(400).json({ error: 'Missing or empty hebrewText' });
    }

    // eslint-disable-next-line no-undef
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error('ANTHROPIC_API_KEY missing on server');
        return res.status(500).json({ error: 'Server configuration error: Missing ANTHROPIC_API_KEY' });
    }

    try {
        const anthropic = new Anthropic({ apiKey });
        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            system: TRANSLATION_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Source reference: ${ref || 'Unknown'}\n\nText to translate:\n${hebrewText}`
                }
            ]
        });

        const rawText = message.content[0].text;

        // Parse the structured JSON response from the model
        let result;
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        } catch {
            // If model didn't return JSON, wrap the raw text with low confidence
            result = { translation: rawText, isAramaic: false, confidence: 'low' };
        }

        return res.status(200).json({
            translation: result.translation || rawText,
            isAramaic: result.isAramaic || false,
            confidence: result.confidence || 'medium',
            model: 'claude-haiku-4-5-20251001'
        });

    } catch (error) {
        console.error('Anthropic API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
