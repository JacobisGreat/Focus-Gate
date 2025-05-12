// State
let isBlocked = false;

// Check if current page should be blocked
async function checkBlockStatus() {
  const { focusActive, blockList } = await chrome.storage.local.get(['focusActive', 'blockList']);
  
  if (!focusActive || !Array.isArray(blockList)) return false;
  
  const url = new URL(window.location.href);
  return blockList.some(domain => url.hostname.includes(domain));
}

// Create and show block screen
function showBlockScreen() {
  if (isBlocked) return;
  isBlocked = true;
  
  // Get current session info
  chrome.storage.local.get(['currentSession'], ({ currentSession }) => {
    const task = currentSession?.task || 'your current task';
    const startTime = currentSession?.start ? new Date(currentSession.start) : new Date();
    const duration = currentSession?.duration || 25;
    
    // Calculate time remaining
    const now = new Date();
    const elapsed = (now - startTime) / 1000 / 60; // in minutes
    const remaining = Math.max(0, duration - elapsed);
    
    // Create block screen
    const blockScreen = document.createElement('div');
    blockScreen.className = 'focusgate-block-screen';
    blockScreen.innerHTML = `
      <style>
        .focusgate-block-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #0f172a;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 2rem;
          text-align: center;
        }
        
        .focusgate-block-screen h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #f43f5e;
        }
        
        .focusgate-block-screen p {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }
        
        .focusgate-block-screen .task {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 1rem 0;
          color: #6366f1;
        }
        
        .focusgate-block-screen .timer {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 1rem 0;
          color: #22c55e;
        }
        
        .focusgate-block-screen .actions {
          margin-top: 2rem;
          display: flex;
          gap: 1rem;
        }
        
        .focusgate-block-screen button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .focusgate-block-screen .complete-btn {
          background: #22c55e;
          color: white;
        }
        
        .focusgate-block-screen .complete-btn:hover {
          background: #16a34a;
        }
        
        .focusgate-block-screen .override-btn {
          background: #f43f5e;
          color: white;
        }
        
        .focusgate-block-screen .override-btn:hover {
          background: #e11d48;
        }
      </style>
      
      <h1>🚫 Focus Mode Active</h1>
      <p>This site is currently blocked to help you stay focused on:</p>
      <div class="task">${task}</div>
      <p>Time remaining:</p>
      <div class="timer">${Math.floor(remaining)}:${Math.floor((remaining % 1) * 60).toString().padStart(2, '0')}</div>
      <div class="actions">
        <button class="complete-btn" onclick="completeTask()">I've Completed My Task</button>
        <button class="override-btn" onclick="overrideBlock()">Override Block</button>
      </div>
    `;
    
    document.documentElement.innerHTML = '';
    document.documentElement.appendChild(blockScreen);
    
    // Start timer
    const timerElement = blockScreen.querySelector('.timer');
    const timerInterval = setInterval(() => {
      const now = new Date();
      const elapsed = (now - startTime) / 1000 / 60;
      const remaining = Math.max(0, duration - elapsed);
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerElement.textContent = "Time's up!";
        timerElement.style.color = '#f43f5e';
      } else {
        timerElement.textContent = `${Math.floor(remaining)}:${Math.floor((remaining % 1) * 60).toString().padStart(2, '0')}`;
      }
    }, 1000);
  });
}

// Handle task completion
async function completeTask() {
  const { currentSession } = await chrome.storage.local.get(['currentSession']);
  
  if (currentSession) {
    // Send completion message to popup
    chrome.runtime.sendMessage({
      type: 'taskComplete',
      session: currentSession
    });
  }
  
  // Remove block screen
  isBlocked = false;
  window.location.reload();
}

// Handle block override
async function overrideBlock() {
  const { currentSession } = await chrome.storage.local.get(['currentSession']);
  
  if (currentSession) {
    // Send override message to popup
    chrome.runtime.sendMessage({
      type: 'blockOverride',
      session: currentSession
    });
  }
  
  // Remove block screen
  isBlocked = false;
  window.location.reload();
}

// Initialize
async function initialize() {
  const shouldBlock = await checkBlockStatus();
  if (shouldBlock) {
    showBlockScreen();
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.focusActive || changes.blockList) {
    const shouldBlock = await checkBlockStatus();
    if (shouldBlock && !isBlocked) {
      showBlockScreen();
    } else if (!shouldBlock && isBlocked) {
      isBlocked = false;
      window.location.reload();
    }
  }
});

// Start the extension
initialize();