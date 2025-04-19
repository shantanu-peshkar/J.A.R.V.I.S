
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");
const twilio = require("twilio"); // Import Twilio
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Import Gemini API
const chatRoutes = require("./routes/chatRoutes");
const noteRoutes = require("./routes/noteRoutes");
const diagramRoutes = require("./routes/daigram");
const moodRoutes = require("./routes/moodRoutes"); // <-- add this with other routes
const reminderRoutes = require('./routes/reminders');
const apiroute = require("./routes/api");
const User = require("./models/User");

const app = express();
const PORT = 3000;

// Initialize Gemini API globally
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Middleware
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB (Local)
mongoose.connect("mongodb://127.0.0.1:27017/chatDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: "mongodb://127.0.0.1:27017/chatDB" }),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy for Login
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Authentication Routes
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists.' });
        }
        const newUser = new User({ username });
        User.register(newUser, password, (err, user) => {
            if (err) {
                console.error("Error during registration: ", err);
                return res.status(500).json({ message: 'Error during signup.' });
            }
            passport.authenticate('local')(req, res, () => {
                res.status(201).json({ message: 'Signup successful.', user: { id: user.id, username: user.username } });
            });
        });
    } catch (err) {
        console.error("Error in signup route: ", err);
        res.status(500).json({ message: 'Error during signup.' });
    }
});

app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: info.message });
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            res.json({ message: 'Login successful.', user: { id: req.user.id, username: req.user.username } });
        });
    })(req, res, next);
});

app.get('/api/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error during logout.' });
        }
        res.json({ message: 'Logout successful.' });
    });
});

app.get('/api/auth/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ isAuthenticated: true, user: { id: req.user.id, username: req.user.username } });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Use chat and note routes
app.use("/chat", chatRoutes);
app.use("/notes", noteRoutes);
app.use("/api/diagram", diagramRoutes);
app.use("/api/mood", moodRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api', apiroute);

// Set up Twilio for WhatsApp messaging
const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Twilio Account SID
const authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Twilio Auth Token
const client = twilio(accountSid, authToken);


app.post('/whatsapp', async (req, res) => {
    const { Body, From } = req.body; // Body: message content, From: the sender's WhatsApp number

    try {
        if (!model) {
            return res.status(500).send('Gemini model is not initialized properly!');
        }

        let prompt = Body;
        // Process the message to give a clear prompt for Gemini
        if (Body.toLowerCase().includes("point wise") || Body.toLowerCase().includes("point-wise") || Body.toLowerCase().includes("numbered points")) {
            prompt = `Provide the following information as a concise, numbered list, starting with 1: ${Body.replace(/point wise/i, '').replace(/point-wise/i, '').replace(/numbered points/i, '')}`;
        } else {
            prompt = `Answer the following question or statement in a natural and informative paragraph: ${Body}`;
        }

        console.log("Sending request to Gemini API with prompt:", prompt);

        // Generate content using the Gemini API
        const result = await model.generateContent(prompt);

        if (!result || !result.response || !result.response.candidates || !result.response.candidates[0]) {
            console.error("Invalid response format from Gemini API:", result);
            return res.status(500).send('Error generating response!');
        }

        const botReply = result.response.candidates[0].content.parts[0].text;

        // Send a response back to the WhatsApp number using Twilio
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // Send back the reply to the WhatsApp number that sent the message
        client.messages
            .create({
                body: botReply,
                from: 'whatsapp:+14155238886',   // Your Twilio WhatsApp number
                to: From,
            })
            .then((message) => console.log('Message sent:', message.sid))
            .catch((err) => console.error('Error sending message:', err));

        res.sendStatus(200); // Acknowledge that the request was successfully received
    } catch (err) {
        console.error("Error processing message:", err);
        res.status(500).send('Something went wrong!');
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});