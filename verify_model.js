import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Note: older SDKs might not have listModels. If this fails, we'll know.
        // For @google/generative-ai, we usually just try to get a model.
        // There isn't a direct "listModels" in the client SDK usually, it's often a REST call.
        // Let's try to just instantiate the model and run a dummy prompt to see if it works.

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent("Hello");
        console.log("Model 'gemini-3-flash-preview' exists! Response:", result.response.text());
    } catch (error) {
        console.error("Error with 'gemini-3-flash-preview':", error.message);

        // Fallback: try to list models via raw REST request if SDK doesn't support it convenience
        // This is a rough check.
    }
}

listModels();
