document.getElementById("startBtn").onclick = () => {
    const task = document.getElementById("task").value;
    chrome.storage.local.set({ focusActive: true, task }, () => {
      document.getElementById("status").innerText = "Focus session started!";
    });
  };
  
  document.getElementById("submitProofBtn").onclick = () => {
    const proof = document.getElementById("proof").value;
    chrome.storage.local.get(["task"], ({ task }) => {
      fetch("http://localhost:3000/api/validate-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, proof })
      })
        .then(res => res.json())
        .then(data => {
          document.getElementById("status").innerText = data.result;
          if (data.success) {
            chrome.storage.local.set({ focusActive: false });
          }
        });
    });
  };
  