const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const MODEL_NAME = "models/gemini-1.5-flash";

router.post("/generate", async (req, res) => {
    const { prompt } = req.body;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const fullPrompt = `Generate a flowchart in Mermaid.js syntax for this prompt:\n"${prompt}".\nOnly return the Mermaid diagram code starting with 'graph TD'.`;

    try {
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

        const match = text.match(/graph TD[\s\S]*/);
        const mermaidCode = match ? match[0].trim() : "graph TD\nA[Could not generate diagram]";

        res.json({ mermaidCode });
    } catch (err) {
        console.error("Gemini error:", err);
        res.status(500).json({ error: "Gemini API Error" });
    }
});

module.exports = router;
