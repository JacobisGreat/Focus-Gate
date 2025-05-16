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
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #f43f5e;
          font-weight: 700;
        }
        
        .focusgate-block-screen .task {
          font-size: 1.4rem;
          font-weight: 600;
          margin: 1.5rem 0;
          color: #6366f1;
          max-width: 600px;
          line-height: 1.4;
        }
        
        .focusgate-block-screen .timer {
          font-size: 4rem;
          font-weight: 700;
          margin: 2rem 0;
          color: #22c55e;
          font-family: monospace;
        }
        
        .focusgate-block-screen .motivation {
          font-size: 1.2rem;
          margin: 1rem 0;
          color: #94a3b8;
          max-width: 500px;
          line-height: 1.5;
        }
      </style>
      
      <h1>🚫 Focus Mode Active</h1>
      <div class="task">${task}</div>
      <div class="timer">${Math.floor(remaining)}:${Math.floor((remaining % 1) * 60).toString().padStart(2, '0')}</div>
      <div class="motivation">Stay focused on your goal. Every minute counts towards your success!</div>
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
        
        // Show completion message
        const motivation = blockScreen.querySelector('.motivation');
        motivation.textContent = "Great job staying focused! Your session is complete.";
        motivation.style.color = '#22c55e';
        
        // End the session
        chrome.runtime.sendMessage({
          type: 'taskComplete',
          session: currentSession
        });
      } else {
        timerElement.textContent = `${Math.floor(remaining)}:${Math.floor((remaining % 1) * 60).toString().padStart(2, '0')}`;
      }
    }, 1000);
  });
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
