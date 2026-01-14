// server.js
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const fs = require("fs");
const Recipe = require("./models/Recipe");

const app = express();
const port = process.env.PORT || 3000;

// Google Generative AI setup
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "AIzaSyCO-Ovhb9lNKaIZUtwkHPdUxNSRrvUVw8A");
} catch (err) {
  console.warn("Google Generative AI initialization failed:", err.message);
  genAI = null;
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookiemice', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
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

// Route to list available models
app.get("/api/models", async (req, res) => {
  try {
    if (!genAI) {
      return res.json({ error: "AI service not configured." });
    }
    const models = await genAI.listModels();
    res.json(models);
  } catch (err) {
    console.error("Error listing models:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API endpoint for asking cooking questions using Google Generative AI
app.post("/api/ask", async (req, res) => {
  try {
    const { question, language } = req.body;
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    if (!genAI) {
      return res.json({ answer: "AI service not configured. Please set GOOGLE_API_KEY environment variable." });
    }

    // Fetch recipes for context if question mentions recipes
    let recipesContext = "";
    if (question.toLowerCase().includes("recipe")) {
      const recipes = await Recipe.find({ language: language || "English" }).limit(5);
      if (recipes.length > 0) {
        recipesContext = "Available recipes: " + recipes.map(r => r.title).join(", ") + ". ";
      }
    }

    const systemPrompt = `You are a helpful cooking assistant. Provide concise, accurate cooking advice. Respond in ${language || "English"}. ${recipesContext}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(systemPrompt + "\n\nUser: " + question);
    const response = await result.response;
    const answer = response.text();

    res.json({ answer });
  } catch (err) {
    console.error("Error in /api/ask:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Speech-to-text endpoint using OpenAI Whisper
app.post("/api/speech-to-text", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Note: Speech-to-text not supported with Hugging Face router, placeholder
    res.json({ text: "Speech-to-text not implemented with current setup" });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("Error in /api/speech-to-text:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Text-to-speech endpoint using OpenAI TTS
app.post("/api/text-to-speech", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Note: Text-to-speech not supported with Hugging Face router, placeholder
    res.json({ audio: "Text-to-speech not implemented with current setup" });
  } catch (err) {
    console.error("Error in /api/text-to-speech:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// CRUD routes for recipes

// Get all recipes
app.get("/api/recipes", async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (err) {
    console.error("Error fetching recipes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single recipe by ID
app.get("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(recipe);
  } catch (err) {
    console.error("Error fetching recipe:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new recipe
app.post("/api/recipes", async (req, res) => {
  try {
    const { title, ingredients, instructions, prepTime, cookTime, servings, tags, language } = req.body;
    const newRecipe = new Recipe({ title, ingredients, instructions, prepTime, cookTime, servings, tags, language });
    await newRecipe.save();
    res.status(201).json(newRecipe);
  } catch (err) {
    console.error("Error creating recipe:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a recipe by ID
app.put("/api/recipes/:id", async (req, res) => {
  try {
    const { title, ingredients, instructions, prepTime, cookTime, servings, tags, language } = req.body;
    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { title, ingredients, instructions, prepTime, cookTime, servings, tags, language },
      { new: true }
    );
    if (!updatedRecipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(updatedRecipe);
  } catch (err) {
    console.error("Error updating recipe:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a recipe by ID
app.delete("/api/recipes/:id", async (req, res) => {
  try {
    const deletedRecipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!deletedRecipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json({ message: "Recipe deleted successfully" });
  } catch (err) {
    console.error("Error deleting recipe:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
