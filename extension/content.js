const blockList = ["youtube.com", "twitter.com", "tiktok.com"];

chrome.storage.local.get(["focusActive"], ({ focusActive }) => {
  if (focusActive) {
    if (blockList.some(url => window.location.href.includes(url))) {
      document.documentElement.innerHTML = `
        <h1 style="text-align:center; margin-top:20%">🚫 Blocked during focus!</h1>`;
    }
  }
});
