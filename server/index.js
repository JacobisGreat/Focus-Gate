require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Unified message processor
app.post("/api/process-message", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ intent: "chat", reply: "" });

  try {
    // Ask GPT to classify and handle focus/proof/chat
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
You are FocusBot, an AI productivity coach.
When the user describes their work plan (e.g., "I need to write my essay"), you respond with JSON:
  {"intent":"focus","task":"...","blockList":["domain1.com","domain2.com",...]}

When the user reports completion/proof of work (e.g., "Here's my draft"), you respond with JSON:
  {"intent":"proof","proofResult":"...","proofSuccess":true|false}

For any other messages, you respond with JSON:
  {"intent":"chat","reply":"..."}
Only output valid JSON without any extra text.
`
        },
        { role: "user", content: message }
      ]
    });

    const payload = JSON.parse(chat.choices[0].message.content.trim());
    return res.json(payload);

  } catch (err) {
    console.error(err);
    // On error, fallback to simple chat
    return res.status(500).json({ intent: "chat", reply: "Sorry, I hit an error." });
  }
});

// Keep your existing /api/validate-proof and /api/chat routes if you still need them

app.listen(3000, () => console.log("🚀 FocusGate server running on port 3000"));