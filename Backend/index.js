// server.js (or index.js) - Voice Module Added
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const fs = require("fs");
const Recipe = require("./models/Recipe"); // Assuming this model exists


// NEW: Import Google Cloud Speech and Text-to-Speech clients
const { SpeechClient } = require('@google-cloud/speech');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
// IMPORTANT: These clients will automatically look for GOOGLE_APPLICATION_CREDENTIALS 
// environment variable for authentication.
const speechClient = new SpeechClient();
const ttsClient = new TextToSpeechClient();


const app = express();
const port = process.env.PORT || 3000;

// Google Generative AI setup
let genAI;
// FIXED: Correct JavaScript syntax for default value assignment using || (Logical OR)
const geminiApiKey = process.env.GOOGLE_API_KEY || "AIzaSyCO-Ovhb9lNKaIZUtwkHPdUxNSRrvUVw8A";

try {
    // Check if the key is present AND if it's not the placeholder
    if (geminiApiKey && geminiApiKey !== "AIzaSyCO-Ovhb9lNKaIZUtwkHPdUxNSRrvUVw8A") {
        genAI = new GoogleGenerativeAI(geminiApiKey);
        console.log("Gemini AI client initialized successfully.");
    } else {
        console.error("ERROR: GOOGLE_API_KEY environment variable is not set. AI functionality will be disabled.");
        genAI = null;
    }
} catch (err) {
    console.error("Google Generative AI initialization failed:", err.message);
    genAI = null;
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookiemice')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from Frontend directory
app.use(express.static(path.join(__dirname, '../Frontend')));

// Serve assets
app.use('/assets', express.static(path.join(__dirname, '../ASSETS')));

// Multer for file uploads (for speech-to-text)
const upload = multer({ dest: 'uploads/' });

// A simple “health check” route
app.get("/", (req, res) => {
    res.send("Hello from Cooking Assistant Express Server!");
});

// API endpoint for asking cooking questions using Google Generative AI
app.post("/api/ask", async (req, res) => {
    try {
        const { question, language } = req.body;
        if (!question) {
            return res.status(400).json({ error: "No question provided" });
        }

        if (!genAI) {
            // Updated error message to be more explicit
            return res.json({ answer: "AI service not configured. Please set GOOGLE_API_KEY environment variable." });
        }

        let recipesContext = "";
        if (question.toLowerCase().includes("recipe")) {
            const recipes = await Recipe.find({ language: language || "English" }).limit(5);
            if (recipes.length > 0) {
                // Correctly accesses the 'title' property.
                recipesContext = "Available recipes: " + recipes.map(r => r.title).join(", ") + ". ";
            }
        }

        // Updated system prompt for structured output (as requested previously)
        const systemPrompt = `You are a helpful cooking assistant. Your response must be highly structured and use markdown.
**Format your answer strictly with:**
1. A **Main Headline (##)** summarizing the answer.
2. A **Sub-Headline (###)** for the main steps or points.
3. Detailed information using **Bullet Points (*)** and **bolding** key terms.
4. Conclude with a final **"💡 Things to Remember"** section using a blockquote (>).
If the topic is a recipe, you may suggest an image related to the final dish (e.g., ). Respond in ${language || "English"}. ${recipesContext}`;

        // Model fixed to gemini-2.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent(systemPrompt + "\n\nUser: " + question);
        const response = await result.response;
        const answer = response.text();

        res.json({ answer });
    } catch (err) {
        console.error("Error in /api/ask:", err);
        
        // This block specifically targets the API_KEY_INVALID error you reported
        if (err.statusText === 'Bad Request' && err.errorDetails && err.errorDetails.some(d => d.reason === 'API_KEY_INVALID')) {
            return res.status(500).json({ error: "Gemini API Key is INVALID. Please provide a valid key." });
        }
        
        if (err.status === 404) {
            return res.status(500).json({ error: "AI Model not found or unsupported. Check your model name." });
        }
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
});

// 🎤 Speech-to-text endpoint using Google Cloud Speech-to-Text
app.post("/api/speech-to-text", upload.single('audio'), async (req, res) => {
    // ... (No changes here) ...
    if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
    }

    const filePath = req.file.path;
    let transcription = { text: "Transcription failed." };
    
    try {
        // Read the audio file buffer
        const audioBytes = fs.readFileSync(filePath).toString('base64');
        
        const audio = { content: audioBytes };
        const config = {
            encoding: 'LINEAR16', // This is often used for typical browser microphone recordings (.wav or similar)
            sampleRateHertz: 16000, // Common sample rate, adjust if necessary
            languageCode: 'en-US',
        };
        const request = { audio: audio, config: config };

        // Calls the Google Cloud Speech-to-Text API
        const [response] = await speechClient.recognize(request);
        const results = response.results;
        
        if (results && results[0] && results[0].alternatives[0]) {
            transcription.text = results[0].alternatives[0].transcript;
        } else {
            transcription.text = "Could not understand the audio.";
        }

        res.json({ text: transcription.text });
    } catch (err) {
        console.error("Error in /api/speech-to-text:", err);
        // Added check for common GCS auth error
        if (err.details && err.details.includes('authentication')) {
             return res.status(500).json({ error: "Speech-to-text authentication failed. Check GOOGLE_APPLICATION_CREDENTIALS." });
        }
        res.status(500).json({ error: "Speech-to-text processing failed: " + err.message });
    } finally {
        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

// 🔊 Text-to-speech endpoint using Google Cloud Text-to-Speech
app.post("/api/text-to-speech", async (req, res) => {
    // ... (No changes here) ...
    const { text, language } = req.body;
    if (!text) {
        return res.status(400).json({ error: "No text provided" });
    }

    try {
        // Construct the Text-to-Speech request
        const request = {
            input: { text: text },
            // Select the language and voice
            voice: { 
                languageCode: language || 'en-US', 
                name: 'en-US-Standard-C' // A standard English voice, you can choose others
            },
            // Select the type of audio encoding
            audioConfig: { audioEncoding: 'MP3' },
        };

        // Calls the Google Cloud Text-to-Speech API
        const [response] = await ttsClient.synthesizeSpeech(request);

        // Set headers for audio file
        res.set('Content-Type', 'audio/mp3');
        res.send(response.audioContent);

    } catch (err) {
        console.error("Error in /api/text-to-speech:", err);
        // Added check for common GCS auth error
         if (err.details && err.details.includes('authentication')) {
             return res.status(500).json({ error: "Text-to-speech authentication failed. Check GOOGLE_APPLICATION_CREDENTIALS." });
        }
        res.status(500).json({ error: "Text-to-speech processing failed: " + err.message });
    }
});

// CRUD routes for recipes (omitted for brevity, assume they are still here)
// ...

// Start server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});