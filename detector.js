// detector.js  – runs as content‑script (has chrome.*)
// 📬 Listen for requests from inject.js to get pattern list
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;

  if (msg?.type === "GET_ENABLED_PATTERNS") {
    chrome.storage.local.get("enabledPatterns", ({ enabledPatterns }) => {
      window.postMessage({
        type: "ENABLED_PATTERNS_RESULT",
        enabledPatterns: enabledPatterns || []
      }, "*");
    });
  }
});

chrome.storage.local.get("enabledPatterns", ({ enabledPatterns = [] }) => {
  // Send enabled pattern list to inject.js in a CSP‑safe way
window.postMessage(
  { type: "ENABLED_PATTERNS_RESULT", enabledPatterns: enabledPatterns || [] },
  "*"
);

  (document.documentElement || document.head).appendChild(cfg);
  cfg.remove();

  // 2. Inject main leak‑detector script
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("inject.js"); // page-context detector
  (document.documentElement || document.head).appendChild(s);
  s.remove();
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;

  if (msg?.type === "GET_ENABLED_PATTERNS") {
    chrome.storage.local.get("enabledPatterns", ({ enabledPatterns }) => {
      window.postMessage({
        type: "ENABLED_PATTERNS_RESULT",
        enabledPatterns
      }, "*");
    });
  }
});
// Respond to requests for enabled patterns from inject.js
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;

  if (msg?.type === "GET_ENABLED_PATTERNS") {
    chrome.storage.local.get("enabledPatterns", ({ enabledPatterns }) => {
      window.postMessage({
        type: "ENABLED_PATTERNS_RESULT",
        enabledPatterns: enabledPatterns || []
      }, "*");
    });
  }
});

