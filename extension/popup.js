// State Management
const state = {
  focusActive: false,
  currentSession: null,
  settings: {
    defaultDuration: 25,
    blockNotifications: true,
    blockedSites: []
  }
};

// UI Elements
const elements = {
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  chatLog: document.getElementById('chatLog'),
  focusStatus: document.getElementById('focusStatus'),
  themeToggle: document.getElementById('themeToggle'),
  defaultDuration: document.getElementById('defaultDuration'),
  blockNotifications: document.getElementById('blockNotifications'),
  blockedSitesList: document.getElementById('blockedSitesList'),
  addSiteBtn: document.getElementById('addSiteBtn')
};

// Message Helpers
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(sender, text, type, timestamp) {
  const entry = document.createElement('div');
  entry.className = `message ${type}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  
  const time = document.createElement('span');
  time.className = 'timestamp';
  time.textContent = timestamp;
  
  entry.appendChild(bubble);
  entry.appendChild(time);
  elements.chatLog.appendChild(entry);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function appendTyping() {
  const id = 'typing-' + Date.now();
  const entry = document.createElement('div');
  entry.id = id;
  entry.className = 'message bot typing';
  entry.innerHTML = '<div class="bubble">FocusBot is thinking...</div>';
  elements.chatLog.appendChild(entry);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
  return id;
}

function removeTyping(id) {
  const element = document.getElementById(id);
  if (element) element.remove();
}

// Storage Helpers
async function saveToStorage(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function getFromStorage(key, defaultValue = null) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? defaultValue;
}

// Chat History Management
async function saveMessage(sender, text, time) {
  const chatHistory = await getFromStorage('chatHistory', []);
  chatHistory.push({ sender, text, time });
  if (chatHistory.length > 100) chatHistory.shift();
  await saveToStorage('chatHistory', chatHistory);
}

async function loadChatHistory() {
  const chatHistory = await getFromStorage('chatHistory', []);
  if (!chatHistory.length) {
    const intro = [
      { sender: 'bot', text: "👋 Hi! I'm FocusBot, your AI productivity coach.", time: formatTime(new Date()) },
      { sender: 'bot', text: "Tell me what you'd like to focus on, and I'll help you stay on track.", time: formatTime(new Date()) }
    ];
    await saveToStorage('chatHistory', intro);
    intro.forEach(m => appendMessage(m.sender, m.text, m.sender === 'bot' ? 'bot' : 'user', m.time));
  } else {
    chatHistory.forEach(m => appendMessage(m.sender, m.text, m.sender === 'bot' ? 'bot' : 'user', m.time));
  }
}

// Session Management
async function startFocusSession(task, blockList, duration) {
  const session = {
    start: new Date().toISOString(),
    task: "Focus Session",
    blockList: [
      "youtube.com",
      "facebook.com",
      "twitter.com",
      "reddit.com",
      "instagram.com",
      "pinterest.com",
      "linkedin.com",
      "snapchat.com",
      "discord.com",
      "twitch.tv",
      "tumblr.com"
    ],
    duration: duration || state.settings.defaultDuration
  };
  
  state.currentSession = session;
  state.focusActive = true;
  
  await saveToStorage('currentSession', session);
  await saveToStorage('focusActive', true);
  await saveToStorage('blockList', session.blockList);
  
  updateFocusStatus();
  updateBlockRules();
}

async function endFocusSession(proofSuccess) {
  if (!state.currentSession) return;
  
  const session = {
    ...state.currentSession,
    end: new Date().toISOString(),
    proofSuccess
  };
  
  const sessionHistory = await getFromStorage('sessionHistory', []);
  sessionHistory.push(session);
  await saveToStorage('sessionHistory', sessionHistory);
  
  state.currentSession = null;
  state.focusActive = false;
  
  await saveToStorage('currentSession', null);
  await saveToStorage('focusActive', false);
  await saveToStorage('blockList', []);
  
  updateFocusStatus();
  updateBlockRules();
  updateDashboard();
}

// UI Updates
function updateFocusStatus() {
  if (state.focusActive && state.currentSession) {
    elements.focusStatus.textContent = `Focusing on: ${state.currentSession.task}`;
    elements.focusStatus.style.color = 'var(--success)';
  } else {
    elements.focusStatus.textContent = 'Not in focus mode';
    elements.focusStatus.style.color = 'var(--text-secondary)';
  }
}

async function updateDashboard() {
  const sessionHistory = await getFromStorage('sessionHistory', []);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  // Calculate stats
  let focusHours = 0;
  let successCount = 0;
  const siteCount = {};
  const daysSet = new Set();
  
  sessionHistory.forEach(session => {
    const startTime = new Date(session.start).getTime();
    if (startTime >= weekAgo) {
      const duration = (new Date(session.end) - new Date(session.start)) / 3600000;
      focusHours += duration;
      if (session.proofSuccess) successCount++;
      session.blockList.forEach(site => siteCount[site] = (siteCount[site] || 0) + 1);
      daysSet.add(new Date(session.start).toDateString());
    }
  });
  
  // Update UI
  document.getElementById('focusHours').textContent = focusHours.toFixed(1);
  document.getElementById('proofRate').textContent = 
    sessionHistory.length ? Math.round((successCount / sessionHistory.length) * 100) : 0;
  document.getElementById('mostBlocked').textContent = 
    Object.entries(siteCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  
  // Calculate streak
  let streak = 0;
  for (let i = 0; ; i++) {
    const date = new Date(now - i * 86400000).toDateString();
    if (daysSet.has(date)) streak++;
    else break;
  }
  document.getElementById('streakCount').textContent = streak;
  
  // Update recent sessions
  const sessionsList = document.getElementById('sessionsList');
  sessionsList.innerHTML = '';
  
  sessionHistory.slice(-5).reverse().forEach(session => {
    const entry = document.createElement('div');
    entry.className = 'session-entry';
    entry.innerHTML = `
      <div class="session-task">${session.task}</div>
      <div class="session-duration">
        ${((new Date(session.end) - new Date(session.start)) / 60000).toFixed(0)} min
      </div>
      <div class="session-status ${session.proofSuccess ? 'success' : 'failed'}">
        ${session.proofSuccess ? '✓' : '✗'}
      </div>
    `;
    sessionsList.appendChild(entry);
  });
}

// Block Rules Management
async function updateBlockRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = rules.map(r => r.id);
  
  if (removeIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
  }
  
  if (state.focusActive && state.currentSession?.blockList) {
    const newRules = state.currentSession.blockList.map((domain, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: ['main_frame']
      }
    }));
    
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: newRules });
  }
}

// Settings Management
async function loadSettings() {
  const settings = await getFromStorage('settings', {
    defaultDuration: 25,
    blockNotifications: true
  });
  state.settings = settings;
  
  elements.defaultDuration.value = settings.defaultDuration;
  elements.blockNotifications.checked = settings.blockNotifications;
}

async function saveSettings() {
  await saveToStorage('settings', state.settings);
}

// Event Handlers
async function handleSendMessage() {
  const text = elements.chatInput.value.trim();
  if (!text) return;
  
  elements.chatInput.value = '';
  const time = formatTime(new Date());
  
  appendMessage('user', text, 'user', time);
  await saveMessage('user', text, time);
  
  const typingId = appendTyping();
  
  try {
    const response = await fetch('http://localhost:3000/api/process-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    
    const data = await response.json();
    removeTyping(typingId);
    
    if (data.intent === 'focus') {
      await startFocusSession(data.task, data.blockList, data.duration);
      appendMessage('bot', `🔒 Focus mode activated for ${data.duration} minutes. Blocking distracting websites.`, 'bot', time);
      await saveMessage('bot', `Focus mode activated for ${data.duration} minutes. Blocking distracting websites.`, time);
    } else if (data.intent === 'unblock_request') {
      appendMessage('bot', data.reply, 'bot', time);
      await saveMessage('bot', data.reply, time);
    } else if (data.intent === 'unblock_verify') {
      if (data.proofSuccess) {
        await endFocusSession(true);
        appendMessage('bot', data.proofResult, 'bot', time);
        await saveMessage('bot', data.proofResult, time);
        appendMessage('bot', '🎉 Great job! Focus session completed successfully.', 'bot', time);
        await saveMessage('bot', 'Great job! Focus session completed successfully.', time);
      } else {
        appendMessage('bot', 'Please provide clear proof of your completed work.', 'bot', time);
        await saveMessage('bot', 'Please provide clear proof of your completed work.', time);
      }
    } else if (data.intent === 'temp_access') {
      // Store current session state
      const currentSession = state.currentSession;
      const currentBlockList = state.currentSession?.blockList;
      
      // Temporarily disable blocking
      await saveToStorage('blockList', []);
      await updateBlockRules();
      
      appendMessage('bot', data.reply, 'bot', time);
      await saveMessage('bot', data.reply, time);
      
      // Set timeout to restore blocking
      setTimeout(async () => {
        if (currentSession && currentBlockList) {
          await saveToStorage('blockList', currentBlockList);
          await updateBlockRules();
          appendMessage('bot', '⏰ Temporary access ended. Focus mode restored.', 'bot', formatTime(new Date()));
          await saveMessage('bot', 'Temporary access ended. Focus mode restored.', formatTime(new Date()));
        }
      }, data.duration * 60 * 1000);
    } else {
      appendMessage('bot', data.reply, 'bot', time);
      await saveMessage('bot', data.reply, time);
    }
  } catch (error) {
    removeTyping(typingId);
    appendMessage('bot', 'Sorry, I encountered an error. Please try again.', 'bot', time);
    await saveMessage('bot', 'Sorry, I encountered an error. Please try again.', time);
  }
}

// Event Listeners
elements.sendBtn.addEventListener('click', handleSendMessage);
elements.chatInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') handleSendMessage();
});

elements.themeToggle.addEventListener('change', () => {
  const theme = elements.themeToggle.checked ? 'dark' : 'light';
  document.body.setAttribute('data-theme', theme);
  saveToStorage('theme', theme);
});

elements.defaultDuration.addEventListener('change', () => {
  state.settings.defaultDuration = parseInt(elements.defaultDuration.value);
  saveSettings();
});

elements.blockNotifications.addEventListener('change', () => {
  state.settings.blockNotifications = elements.blockNotifications.checked;
  saveSettings();
});

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.tab-btn.active').classList.remove('active');
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
  });
});

// Initialize
async function initialize() {
  // Load saved theme
  const theme = await getFromStorage('theme', 'light');
  document.body.setAttribute('data-theme', theme);
  elements.themeToggle.checked = theme === 'dark';
  
  // Load settings
  await loadSettings();
  
  // Load chat history
  await loadChatHistory();
  
  // Load current session state
  const currentSession = await getFromStorage('currentSession');
  const focusActive = await getFromStorage('focusActive', false);
  
  if (currentSession && focusActive) {
    state.currentSession = currentSession;
    state.focusActive = true;
    updateFocusStatus();
  }
  
  // Update dashboard
  await updateDashboard();
}

// Start the app
initialize();