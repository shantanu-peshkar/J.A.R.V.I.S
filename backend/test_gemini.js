require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: "What is the capital of France?" }] }],
        });
        console.log("Test successful:", result.response?.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (error) {
        console.error("Test failed:", error);
    }
}

testGemini();