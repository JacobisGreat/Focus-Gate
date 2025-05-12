// State
const state = {
  focusActive: false,
  blockList: [],
  currentSession: null
};

// Initialize storage and state
chrome.runtime.onInstalled.addListener(async () => {
  // Set initial state
  await chrome.storage.local.set({
    focusActive: false,
    blockList: [],
    currentSession: null,
    sessionHistory: [],
    settings: {
      defaultDuration: 25,
      blockNotifications: true,
      blockedSites: []
    }
  });
  
  // Load state
  await loadState();
});

// Load state from storage
async function loadState() {
  const { focusActive, blockList, currentSession } = await chrome.storage.local.get([
    'focusActive',
    'blockList',
    'currentSession'
  ]);
  
  state.focusActive = focusActive;
  state.blockList = blockList;
  state.currentSession = currentSession;
  
  await updateBlockRules();
}

// Update block rules
async function updateBlockRules() {
  // Remove existing rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map(rule => rule.id);
  
  if (removeIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeIds
    });
  }
  
  // Add new rules if focus is active
  if (state.focusActive && Array.isArray(state.blockList)) {
    const rules = state.blockList.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: ['main_frame']
      }
    }));
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });
  }
}

// Handle storage changes
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  
  let shouldUpdateRules = false;
  
  if (changes.focusActive) {
    state.focusActive = changes.focusActive.newValue;
    shouldUpdateRules = true;
  }
  
  if (changes.blockList) {
    state.blockList = changes.blockList.newValue;
    shouldUpdateRules = true;
  }
  
  if (changes.currentSession) {
    state.currentSession = changes.currentSession.newValue;
  }
  
  if (shouldUpdateRules) {
    await updateBlockRules();
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'taskComplete') {
    handleTaskComplete(message.session);
  } else if (message.type === 'blockOverride') {
    handleBlockOverride(message.session);
  }
});

// Handle task completion
async function handleTaskComplete(session) {
  const sessionHistory = await chrome.storage.local.get('sessionHistory');
  const updatedHistory = [...(sessionHistory.sessionHistory || []), {
    ...session,
    end: new Date().toISOString(),
    proofSuccess: true
  }];
  
  await chrome.storage.local.set({
    sessionHistory: updatedHistory,
    currentSession: null,
    focusActive: false,
    blockList: []
  });
  
  // Notify user
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: 'Focus Session Completed! 🎉',
    message: `Great job completing your task: ${session.task}`
  });
}

// Handle block override
async function handleBlockOverride(session) {
  const sessionHistory = await chrome.storage.local.get('sessionHistory');
  const updatedHistory = [...(sessionHistory.sessionHistory || []), {
    ...session,
    end: new Date().toISOString(),
    proofSuccess: false,
    overridden: true
  }];
  
  await chrome.storage.local.set({
    sessionHistory: updatedHistory,
    currentSession: null,
    focusActive: false,
    blockList: []
  });
  
  // Notify user
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: 'Focus Session Interrupted ⚠️',
    message: `You overrode the block for: ${session.task}`
  });
}

// Handle tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && state.focusActive) {
    const url = new URL(tab.url);
    if (state.blockList.some(domain => url.hostname.includes(domain))) {
      // Notify user
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Focus Mode Active 🔒',
        message: `Stay focused on: ${state.currentSession?.task || 'your task'}`
      });
    }
  }
});