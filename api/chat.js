import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    runtime: 'edge', // Use Edge runtime for faster cold starts
};

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

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { message, history } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY; // Accessing environment variable securely on the server!

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash', // Use standard Flash model
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: { responseMimeType: "application/json" }
        });

        const chat = model.startChat({
            history: history || []
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return new Response(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
