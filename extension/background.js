chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ focusActive: false });
  });
  