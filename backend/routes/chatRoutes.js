
const express = require("express");
const Chat = require("../models/chat");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { isAuthenticated } = require("../middleware/auth");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Get Chat History (Protected Route)
router.get("/history", isAuthenticated, async (req, res) => {
    try {
        const chat = await Chat.findOne({ userId: req.user.id });
        if (!chat) return res.json({ messages: [] });

        // Group messages by date
        const groupedMessages = chat.messages.reduce((acc, msg) => {
            const date = new Date(msg.timestamp).toLocaleDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp).toLocaleTimeString()
            });
            return acc;
        }, {});

        res.json({ messages: groupedMessages });
    } catch (err) {
        console.error("Error fetching chat history:", err);
        res.status(500).json({ error: "Error fetching chat history" });
    }
});

// Live Chat with Bot (Protected Route)
router.post("/chat", isAuthenticated, async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;

    try {
        let prompt = message;
        if (message.toLowerCase().includes("point wise") || message.toLowerCase().includes("point-wise") || message.toLowerCase().includes("numbered points")) {
            prompt = `Provide the following information as a concise, numbered list, starting with 1. Include only the essential information for each point: ${message.replace(/point wise/i, '').replace(/point-wise/i, '').replace(/numbered points/i, '')}`;
        } else {
            prompt = `Answer the following question or statement in a natural and informative paragraph: ${message}`;
        }

        const result = await model.generateContent(prompt);
        const botReply = result.response.candidates[0].content.parts[0].text;

        let chat = await Chat.findOne({ userId });
        if (!chat) chat = new Chat({ userId, messages: [] });

        const userMessage = { role: "user", content: message, timestamp: new Date() };
        const botMessage = { role: "bot", content: botReply, timestamp: new Date() };

        chat.messages.push(userMessage, botMessage);
        await chat.save();

        res.json({ reply: botReply });
    } catch (err) {
        console.error("Error generating response:", err);
        res.status(500).json({ reply: "Sorry, something went wrong!" });
    }
});

module.exports = router;



















