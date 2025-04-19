const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const MODEL_NAME = "models/gemini-1.5-flash";

router.post("/getMood", async (req, res) => {
    const { userText } = req.body;

    if (!userText || userText.trim() === "") {
        return res.status(400).json({ error: "User text is required" });
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const moodPrompt = `
        Analyze the following text and return only one lowercase word that best describes the user's mood.
        Possible moods: happy, sad, angry, relaxed, energetic, tired.
        Text: "${userText}"
    `;

    try {
        const result = await model.generateContent(moodPrompt);
        const mood = result.response.text().trim().toLowerCase();

        if (["happy", "sad", "angry", "relaxed", "energetic", "tired"].includes(mood)) {
            console.log("✅ Detected mood:", mood);
            res.json({ mood });
        } else {
            console.log("Gemini returned invalid mood:", mood);
            res.status(500).json({ error: "Gemini returned invalid mood" });
        }
    } catch (error) {
        console.error("Gemini mood detection error:", error);
        res.status(500).json({ error: "Mood detection failed" });
    }
});

module.exports = router;