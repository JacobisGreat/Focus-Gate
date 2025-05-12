require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());

// We'll handle text via bodyParser, files via multer:
app.use(bodyParser.json());
const upload = multer({ dest: path.join(__dirname, "uploads/") });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("🎯 FocusGate server is running!");
});

// ————————————————
// Proof-validation endpoint (handles text or image)
// ————————————————
app.post(
  "/api/validate-proof",
  upload.single("proofImage"),
  async (req, res) => {
    const { task, proofText } = req.body;
    const file = req.file;

    if (!task) {
      return res
        .status(400)
        .json({ success: false, result: "Missing task." });
    }
    if (!proofText && !file) {
      return res
        .status(400)
        .json({ success: false, result: "No proof submitted." });
    }

    try {
      // If there's an image, accept it directly for MVP:
      if (file) {
        return res.json({
          success: true,
          result: "✅ Image proof received and accepted!"
        });
      }

      // Otherwise, use GPT to validate text proof:
      const chat = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an assistant who decides if a user's proof matches the task they were supposed to complete."
          },
          {
            role: "user",
            content: `Task: ${task}\nProof: ${proofText}\n\nIs this valid proof? Reply with yes or no.`
          }
        ]
      });

      const answer = chat.choices[0].message.content.trim().toLowerCase();
      if (answer.includes("yes")) {
        return res.json({
          success: true,
          result: "✅ Proof accepted! Distractions unlocked."
        });
      } else {
        return res.json({
          success: false,
          result: "❌ Proof not accepted. Please try again."
        });
      }
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, result: "❌ Error contacting GPT." });
    }
  }
);

// ————————————————
// Chat endpoint (unchanged)
// ————————————————
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message)
    return res.status(400).json({ reply: "Please enter a message." });

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are FocusBot, a productivity coach helping users stay focused and complete their tasks."
        },
        { role: "user", content: message }
      ]
    });
    res.json({ reply: chat.choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "⚠️ Error contacting GPT." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 FocusGate server running at http://localhost:${PORT}`);
});
