import { GoogleGenerativeAI } from '@google/generative-ai';

// Using default Node.js runtime for maximum compatibility


const SYSTEM_INSTRUCTION = `
You are "Chevruta Bot", an expert Jewish librarian and study partner. 
You are knowledgeable in Tanakh, Talmud, Halakha, and Jewish philosophy.
Your goal is to help the user build a source sheet.

Protocol:
1. Analyze the user's request.
2. If the user asks a question that requires sources, "fetch" them mentally and propose them.
3. ALWAYS output your response in valid JSON format with this structure:
{
  "content": "Your conversational response here. Be helpful, scholarly, and efficient. If proposing sources, describe them briefly here too.",
  "suggested_sources": [
    { "ref": "Citation Ref (e.g., Genesis 1:1 or Rashi on Genesis 1:1)", "summary": "One sentence summary of why this is relevant." }
  ]
}
4. If no sources are needed, "suggested_sources" should be an empty array.
5. Use standard Sefaria citation formats (e.g., "Mishnah Berakhot 1:1", "Rashi on Leviticus 19:18").
6. Do NOT provide the full text in the "content" field, just the citation and likelihood of relevance. The user will click to add the full text to the sheet.
`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let body = req.body;
        // Sometimes body is a string (if content-type isn't perfectly matched or config setting)
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error("Failed to parse body string:", body);
                return res.status(400).json({ error: 'Invalid JSON body' });
            }
        }

        const { message, history } = body || {};
        console.log("Received request with message:", message);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("API Key missing on server");
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.0-flash-preview', // Reverting to user-verified model
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: { responseMimeType: "application/json" }
        });

        const chat = model.startChat({
            history: history || []
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return res.status(200).send(text);

    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
