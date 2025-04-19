const express = require("express");
const Note = require("../models/Note");
const { isAuthenticated } = require("../middleware/auth");
const router = express.Router();
const axios = require("axios");

const rapidApiKey = process.env.RAPIDAPI_KEY; // Ensure this is set in your .env file
const rapidApiHost = 'microsoft-translator-text-api3.p.rapidapi.com';
const rapidApiUrl = 'https://microsoft-translator-text-api3.p.rapidapi.com/largetranslate';

// Get All User Notes (Protected Route)
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(notes);
    } catch (err) {
        console.error("Error fetching notes:", err);
        res.status(500).json({ error: "Error fetching notes" });
    }
});

// Save a Chat Message as a Note (Protected Route)
router.post("/save", isAuthenticated, async (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
        return res.status(400).json({ error: "Content is required to save a note." });
    }

    try {
        const newNote = new Note({
            userId: userId,
            title: content.substring(0, 50) + "...", // Or devise a better title logic
            content: content
        });

        await newNote.save();
        res.status(201).json({ message: "Message saved as a note", note: newNote });
    } catch (err) {
        console.error("Error saving note:", err);
        res.status(500).json({ error: "Error saving note" });
    }
});

// Unsave a Chat Message (Delete the Note) (Protected Route)
router.delete("/unsave/:noteId", isAuthenticated, async (req, res) => {
    try {
        const note = await Note.findById(req.params.noteId);
        if (!note) {
            return res.status(404).json({ error: "Note not found" });
        }
        // Ensure the user deleting the note owns it
        if (note.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized to delete this note." });
        }

        const result = await Note.findByIdAndDelete(req.params.noteId);
        res.json({ message: "Note deleted" });
    } catch (err) {
        console.error("Error deleting note:", err);
        res.status(500).json({ error: "Error deleting note" });
    }
});

// Translate a Note (Protected Route)
router.post("/translate", isAuthenticated, async (req, res) => {
    console.log('Backend /api/notes/translate hit (Microsoft Translator)');
    console.log('Backend Request Body:', req.body);

    const { text, to_lang } = req.body; // to_lang from your frontend

    if (!text || !to_lang) {
        console.error('Backend Error: Missing text or target language');
        return res.status(400).json({ error: 'Missing text or target language' });
    }

    if (!rapidApiKey) {
        console.error('Backend Error: RapidAPI key not configured on the server.');
        return res.status(500).json({ error: 'RapidAPI key not configured on the server.' });
    }

    const options = {
        method: 'POST',
        url: rapidApiUrl,
        params: { to: to_lang, from: 'en' }, // You might want to make 'from' dynamic or 'auto'
        headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': rapidApiHost,
            'Content-Type': 'application/json'
        },
        data: { sep: '|', text: text }
    };

    try {
        console.log('Backend: Attempting Microsoft Translator API request...');
        const response = await axios.request(options);
        console.log('Backend Translation Response (Microsoft):', response.data);

        if (response.data && response.data.text) {
            res.json({ translatedText: response.data.text });
        } else {
            console.error('Backend Error: Unexpected Microsoft Translator response:', response.data);
            res.status(500).json({ error: 'Translation failed on the backend: Unexpected response format' });
        }
    } catch (error) {
        console.error('Backend Microsoft Translator Error:', error);
        res.status(500).json({ error: 'Error during translation on the backend' });
    }
});

module.exports = router;