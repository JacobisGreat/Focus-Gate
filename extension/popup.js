// extension/popup.js
document.addEventListener("DOMContentLoaded", () => {
    const sendBtn   = document.getElementById("sendBtn");
    const chatInput = document.getElementById("chatInput");
  
    // Load previous chat history
    loadChatHistory();
  
    // Send button handler
    sendBtn.addEventListener("click", () => {
      const message = chatInput.value.trim();
      if (!message) return;
      chatInput.value = "";
  
      const timestamp = new Date().toLocaleTimeString([], {
        hour:   "2-digit",
        minute: "2-digit"
      });
  
      // Display user message
      appendMessage("You", message, "user", timestamp);
      saveMessage("user", message, timestamp);
  
      // Typing indicator
      const typingId = appendTypingIndicator();
  
      // Send to backend
      fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      })
        .then(res => res.json())
        .then(({ reply }) => {
          removeTypingIndicator(typingId);
          const ts = new Date().toLocaleTimeString([], {
            hour:   "2-digit",
            minute: "2-digit"
          });
          appendMessage("FocusBot", reply, "bot", ts);
          saveMessage("bot", reply, ts);
        })
        .catch(() => {
          removeTypingIndicator(typingId);
          const err = "⚠️ Failed to connect to AI.";
          const ts  = new Date().toLocaleTimeString([], {
            hour:   "2-digit",
            minute: "2-digit"
          });
          appendMessage("FocusBot", err, "bot", ts);
          saveMessage("bot", err, ts);
        });
    });
  });
  
  // ——— Helper functions (unchanged) ———
  
  function appendMessage(sender, text, type, timestamp) {
    const log   = document.getElementById("chatLog");
    const entry = document.createElement("div");
    entry.className = `message ${type}`;
    entry.innerHTML = `
      <div class="bubble">${text}</div>
      <div class="timestamp">${timestamp}</div>
    `;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }
  
  function appendTypingIndicator() {
    const id  = "typing-" + Date.now();
    const log = document.getElementById("chatLog");
    const entry = document.createElement("div");
    entry.id = id;
    entry.className = "message bot typing";
    entry.innerHTML = `<div class="bubble">FocusBot is typing...</div>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    return id;
  }
  
  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
  
  function saveMessage(sender, text, timestamp) {
    chrome.storage.local.get({ chatHistory: [] }, ({ chatHistory }) => {
      chatHistory.push({ sender, text, timestamp });
      if (chatHistory.length > 50) chatHistory.shift();
      chrome.storage.local.set({ chatHistory });
    });
  }
  
  function loadChatHistory() {
    chrome.storage.local.get({ chatHistory: [] }, ({ chatHistory }) => {
      chatHistory.forEach(msg => {
        const type = msg.sender === "bot" ? "bot" : "user";
        appendMessage(msg.sender, msg.text, type, msg.timestamp);
      });
    });
  }
  