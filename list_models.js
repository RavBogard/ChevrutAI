import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No GEMINI_API_KEY found in environment variables.");
    process.exit(1);
}

async function listModels() {
    console.log("Fetching model list...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
        }
        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found in response:", data);
        }
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();
