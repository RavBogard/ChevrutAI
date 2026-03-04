/* eslint-env node */
import { GoogleGenerativeAI } from '@google/generative-ai';

// Using default Node.js runtime for maximum compatibility

const SUGGEST_SYSTEM_INSTRUCTION = `You are a Jewish librarian AI. Given a topic, return ONLY a JSON object with no prose, no markdown fences.

Return between 5 and 8 primary source references relevant to the topic. Format your entire response as:
{"refs": ["ref1", "ref2", ...], "rationale": "one sentence explaining the selection"}

CRITICAL REFERENCE FORMAT RULES:
- Torah: "Genesis 1:1" (ALWAYS include verse — never just "Genesis 1")
- Talmud Bavli: ALWAYS include segment number. "Berakhot 2a:1" is CORRECT. "Berakhot 2a" is WRONG.
- Mishnah: "Mishnah Berakhot 1:1"
- Commentary: "Rashi on Genesis 1:1"
- Mishneh Torah: use Sefaria titles, NEVER "Laws of..." — "Mishneh Torah, Repentance 1:1" is CORRECT, "Mishneh Torah, Laws of Repentance 1:1" is WRONG
- Zohar: prefer Volume:Page format — "Zohar 1:1a", "Zohar 3:55a"
- Hasidic texts (Sefat Emet, Tanya, Kedushat Levi): use low section numbers (1-30), NOT Hebrew calendar years. "Sefat Emet, Genesis, Toldot 1" is CORRECT. "Sefat Emet, Genesis, Toldot 5642:1" is WRONG.
- NEVER include descriptive subtitles in refs. "Even Bochan 28:1" is CORRECT. "Even Bochan, The Prayer of Kalonymus" is WRONG.
- Do NOT suggest obscure or uncertain references. If you are not 100% sure a text exists in Sefaria, do NOT suggest it.

Return ONLY valid JSON. No explanation before or after. No markdown code fences.`;

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

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

async function validateRef(ref) {
    try {
        const encoded = encodeURIComponent(ref);
        const resp = await fetch(`https://www.sefaria.org/api/texts/${encoded}?context=0`);
        if (!resp.ok) return { ref, validated: false, reason: `HTTP ${resp.status}`, heRef: null, he: null, en: null };
        const data = await resp.json();
        if (data.error) return { ref, validated: false, reason: data.error, heRef: null, he: null, en: null };
        const normalizeSnippet = (t) => {
            if (!t) return '';
            const s = Array.isArray(t) ? t.join(' ') : String(t);
            return s.replace(/<[^>]+>/g, '').substring(0, 200);
        };
        const he = normalizeSnippet(data.he);
        const en = normalizeSnippet(data.text); // NOTE: Sefaria uses 'text', not 'en'
        if (!he && !en) return { ref, validated: false, reason: 'Empty text returned', heRef: null, he: null, en: null };
        return {
            ref: data.ref || ref,
            heRef: data.heRef || null,
            he: he || null,
            en: en || null,
            validated: true,
            reason: null
        };
    } catch (e) {
        return { ref, validated: false, reason: e.message, heRef: null, he: null, en: null };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIP)) return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
        }

        const { topic } = body || {};
        if (!topic || typeof topic !== 'string' || !topic.trim()) {
            return res.status(400).json({ error: 'topic is required' });
        }

        // eslint-disable-next-line no-undef
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelVersion = process.env.GEMINI_MODEL_VERSION || 'gemini-3-flash-preview';
        const model = genAI.getGenerativeModel({
            model: modelVersion,
            systemInstruction: SUGGEST_SYSTEM_INSTRUCTION,
            generationConfig: { responseMimeType: 'application/json' }
        });

        // Step 1: Gemini generates ref list as JSON
        let refs = [];
        try {
            const result = await model.generateContent(`Topic: ${topic.trim()}\n\nReturn a JSON object with "refs" array.`);
            const raw = result.response.text();
            // Strip markdown fences if present (fallback for models that ignore responseMimeType)
            const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
            const parsed = JSON.parse(cleaned);
            if (!Array.isArray(parsed.refs)) throw new Error('refs is not an array');
            refs = parsed.refs;
        } catch (parseErr) {
            console.error('Gemini parse error:', parseErr);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        // Step 2: Validate each ref sequentially (not concurrent — Sefaria rate limits)
        const suggestions = [];
        for (const ref of refs.slice(0, 8)) {
            if (typeof ref !== 'string' || !ref.trim()) continue;
            const suggestion = await validateRef(ref.trim());
            suggestions.push(suggestion);
        }

        // Sort: validated first, then unvalidated
        suggestions.sort((a, b) => (b.validated ? 1 : 0) - (a.validated ? 1 : 0));

        return res.status(200).json({ suggestions });
    } catch (error) {
        console.error('Suggest API error:', error);
        return res.status(500).json({ error: error.message });
    }
}
