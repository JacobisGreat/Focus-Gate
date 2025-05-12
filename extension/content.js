const blockList = ["youtube.com", "twitter.com", "tiktok.com"];

chrome.storage.local.get("focusActive", ({ focusActive }) => {
  if (focusActive) {
    if (blockList.some(domain => window.location.href.includes(domain))) {
      document.documentElement.innerHTML = `
        <h1 style="text-align:center; margin-top:20%">🚫 Blocked by FocusGate</h1>
        <p style="text-align:center;">You are in a focus session.</p>`;
    }
  }
});
