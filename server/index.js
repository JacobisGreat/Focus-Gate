// FocusGate Server - Environment variables are properly configured
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 3000;
require("dotenv").config();
const { OpenAI } = require("openai");

console.log("API KEY loaded:", process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


app.get("/", (req, res) => {
  res.send("🎯 FocusGate server is running!");
});

app.post("/api/validate-proof", async (req, res) => {
    const { task, proof } = req.body;
    if (!task || !proof) {
      return res.status(400).json({ success: false, result: "Missing task or proof." });
    }
  
    try {
      const chat = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // or "gpt-4"
        messages: [
          {
            role: "system",
            content: "You are an assistant who decides if a user's proof matches the task they were supposed to complete."
          },
          {
            role: "user",
            content: `Task: ${task}\nProof: ${proof}\n\nIs this valid proof of the task? Respond with 'yes' or 'no'.`
          }
        ]
      });
  
      const answer = chat.choices[0].message.content.trim().toLowerCase();
  
      if (answer.includes("yes")) {
        return res.json({ success: true, result: "✅ Proof accepted! Distractions unlocked." });
      } else {
        return res.json({ success: false, result: "❌ Proof not accepted. Please try again." });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, result: "❌ Error contacting GPT." });
    }
  });
  

app.listen(PORT, () => {
  console.log(`🚀 FocusGate server running at http://localhost:${PORT}`);
});
