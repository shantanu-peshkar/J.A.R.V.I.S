// backend/routes/api.js
const express = require("express");
const { isAuthenticated } = require("../middleware/auth");

const router = express.Router();

// Function to try and construct a valid URL
function constructURL(websiteName) {
    let url = websiteName.trim().toLowerCase();

    // Remove common prefixes if present
    if (url.startsWith("www.")) {
        url = url.substring(4);
    }

    // Add https:// if no protocol is present
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }

    try {
        new URL(url); // Check if it's a valid URL format
        return url;
    } catch (error) {
        return null;
    }
}

router.post("/api/open-website", isAuthenticated, (req, res) => {
    const { command } = req.body;
    const lowerCaseCommand = command.toLowerCase().trim();

    if (lowerCaseCommand.startsWith("open")) {
        const websiteName = lowerCaseCommand.substring(4).trim(); // Extract the website name
        const urlToOpen = constructURL(websiteName);

        if (urlToOpen) {
            return res.json({ website: urlToOpen });
        } else {
            return res.status(400).json({ error: `Sorry, "${websiteName}" doesn't seem like a valid website address.` });
        }
    }

    return res.status(400).json({ error: "Sorry, I didn't understand which website you want to open." });
});

module.exports = router;