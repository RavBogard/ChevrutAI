
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testModel() {
    const genAI = new GoogleGenerativeAI("INVALID_KEY");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    try {
        await model.generateContent("Test");
        console.log("Success (unexpected)");
    } catch (e) {
        if (e.message.includes("API key not valid") || e.status === 400 || e.message.includes("400")) {
            console.log("CONFIRMED: Model found, but key is invalid (Expected).");
        } else if (e.message.includes("not found") || e.status === 404) {
            console.error("FAILED: Model not found.");
            console.error(e.message);
            process.exit(1);
        } else {
            console.log("Other error:", e.message);
        }
    }
}

testModel();
