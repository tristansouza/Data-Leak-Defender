/* Page‑context leak detector (inject.js) */

// ----  A.  Pattern definitions ----
// Request the enabled patterns from the content script
// Wait for enabled pattern list from detector.js
let ENABLED_PATTERNS = null;
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "ENABLED_PATTERNS_RESULT") {
    ENABLED_PATTERNS = new Set(event.data.enabledPatterns || []);
    console.log("✅ Enabled patterns ready:", [...ENABLED_PATTERNS]);
    // you can now start detection
  }
});

window.postMessage({ type: "GET_ENABLED_PATTERNS" }, "*");

// Handle the response
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (msg?.type === "ENABLED_PATTERNS_RESULT") {
    console.log("✅ Got enabled patterns:", msg.enabledPatterns);
    // ✅ Use msg.enabledPatterns to detect personal info
    // your pattern matching logic here...
  }
});

const PATTERN_IDS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  passport_us: /\b[A-Z]{2}\d{7}\b/,
  iban: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/,
  cvv: /\b\d{3,4}\b/,
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  dl_us: /\b[A-Z0-9]{1,15}\b/,
  home_address: /\d{1,5}\s\w+\s\w+/,
  gps: /\b[-+]?\d{1,2}\.\d+,\s*[-+]?\d{1,3}\.\d+\b/,
  dob: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/,
  place_of_birth: /\b(Place\\s+of\\s+Birth:?[A-Za-z\\s]+)\b/i,
  employment: /\b(Employer|Company|Position):?\\s[A-Za-z0-9 \\&]+/i,
  email: /[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,6}/,
  phone: /\\b\\+?\\d[\\d\\s.-]{7,}\\b/,
  credit_card: /\\b(?:\\d[ -]*?){13,16}\\b/
};

// ----  B.  Which IDs are enabled (injected by detector.js) ----
const ENABLED = Array.isArray(window.__DLD_ENABLED_PATTERNS) &&
  window.__DLD_ENABLED_PATTERNS.length
    ? new Set(window.__DLD_ENABLED_PATTERNS)
    : new Set(Object.keys(PATTERN_IDS)); // first run: all on

// helper
const findMatch = (text) => {
  for (const [id, rx] of Object.entries(PATTERN_IDS)) {
    if (ENABLED.has(id) && rx.test(text)) return { id, rx };
  }
  return null;
};

// ... keep the rest of your existing fetch/XHR/beacon interception logic ...
 
(() => {
/* ====== 0. Local‑storage helpers ====== */

const KEY_ALLOW = "__dld_allow__";
const KEY_BLOCK = "__dld_block__";
const get = k => JSON.parse(localStorage.getItem(k) || "[]");
const set = (k, arr) => localStorage.setItem(k, JSON.stringify(arr));

const allow = new Set(get(KEY_ALLOW));
const block = new Set(get(KEY_BLOCK));

/* ====== 1. Patterns ====== */
const PATS = [
  { n: "SSN",   rx: /\b\d{3}-\d{2}-\d{4}\b/ },
  { n: "Visa",  rx: /\b4\d{12}(?:\d{3})?\b/ },
  { n: "Email", rx: /[\w.-]+@[\w.-]+\.[A-Za-z]{2,6}/ }
];
const detect = t => { for (const p of PATS) if (p.rx.test(t)) return p.n; return null; };

/* ====== 2. Cloud‑gaming page whitelist ====== */
const PAGE_WL = [
  "xbox.com","xboxlive.com","playstation.com","playstation.net",
  "nvidia.com","nvidiagrid.net","stadia.google.com","gstatic.com",
  "amazon.com","luna.play.amazon.com","shadow.tech","boosteroid.com",
  "blacknut.com","airconsole.com","parsec.app","steamcommunity.com",
  "steamusercontent.com"
];
const wlHost = h => PAGE_WL.some(w => h === w || h.endsWith("." + w));
if (wlHost(location.hostname)) { console.log("[DLD] Page host whitelisted"); return; }

/* ====== 3. Utilities ====== */
const hname = u => { try { return new URL(u, location.href).hostname; } catch { return ""; } };
const third = u => { try { return hname(u) !== location.hostname; } catch { return false; } };
const toStr = b => !b ? "" :
  (typeof b === "string") ? b :
  (b instanceof FormData) ? [...b].map(([k, v]) => k + "=" + v).join("&") :
  (b instanceof URLSearchParams) ? b.toString() :
  (() => { try { return JSON.stringify(b); } catch { return ""; } })();

/* ====== 4. Side reminder popups ====== */
const popState = {};                 // host -> element
const showSidePopup = (host, text, color, btnLabel, btnAction) => {
  if (popState[host]) return;        // already showing
  const div = document.createElement("div");
  div.style = `
      position:fixed;bottom:20px;right:20px;max-width:260px;
      background:${color};color:#000;padding:10px 14px;border-radius:6px;
      font:13px Arial;z-index:999999;box-shadow:0 0 6px rgba(0,0,0,.3)`;
  function sanitize(str) {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}
someElement.innerHTML = sanitize(divHTML);
      ${text}<br>
      <button style="margin-top:6px;padding:4px 8px;">${btnLabel}</button>`;
  document.body.appendChild(div);
  div.querySelector("button").onclick = () => {
    btnAction();
    div.remove();
    delete popState[host];
  };
  setTimeout(() => { div.remove(); delete popState[host]; }, 10000);
  popState[host] = div;
};

/* ====== 5. Top banner prompt ====== */
let banner = null;
const prompt = (host, msg, onAllow, onBlock) => {
  if (banner) banner.remove();
  bannerElement.innerHTML = sanitize(bannerHTML);
  banner.style = `
    position:fixed;top:0;left:0;width:100%;
    padding:14px;background:#d32f2f;color:#fff;
    font:700 14px Arial;text-align:center;z-index:2147483647`;
  banner.innerHTML = `
    Potential leak to <b>${host}</b><br><small>${msg}</small><br><br>
    <button id="dld-false">Report False Alarm</button>
    <button id="dld-block">Block Request</button>`;
  document.body.appendChild(banner);

  document.getElementById("dld-false").onclick = () => {
    allow.add(host); block.delete(host);
    set(KEY_ALLOW, [...allow]); set(KEY_BLOCK, [...block]);
    banner.style.background = "#1565c0";
    banner.textContent = "Reported as false alarm – be cautious.";
    showSidePopup(host,
      "This site was reported as a false alarm.\nYou may block it anytime.",
      "#ffecb3", "Block site", () => {
        block.add(host); allow.delete(host);
        set(KEY_BLOCK, [...block]); set(KEY_ALLOW, [...allow]);
      });
    setTimeout(() => banner.remove(), 4000);
    onAllow();
  };
  document.getElementById("dld-block").onclick = () => {
    block.add(host); allow.delete(host);
    set(KEY_BLOCK, [...block]); set(KEY_ALLOW, [...allow]);
    banner.style.background = "#2e7d32";
    banner.textContent = "Request blocked.";
    showSidePopup(host,
      "Blocked request to this site.\nUnblock if you change your mind.",
      "#ffcdd2", "Unblock site", () => {
        allow.add(host); block.delete(host);
        set(KEY_ALLOW, [...allow]); set(KEY_BLOCK, [...block]);
      });
    setTimeout(() => banner.remove(), 4000);
    onBlock();
  };
};

/* ====== 6. fetch patch ====== */
const F = window.fetch;
window.fetch = function (input, init = {}) {
  const url = typeof input === "string" ? input : input.url;
  const h = hname(url);
  const body = init.body || (typeof input === "object" && input.body);
  const leak = detect(toStr(body));

  if (leak && third(url)) {
    if (block.has(h)) {
      showSidePopup(h, "Blocked request to this site.", "#ffcdd2",
        "Unblock site", () => { allow.add(h); block.delete(h); set(KEY_ALLOW, [...allow]); set(KEY_BLOCK, [...block]); });
      return Promise.reject(new Error("Blocked by DLD"));
    }
    if (allow.has(h)) {
      showSidePopup(h, "Site previously marked as false alarm.", "#ffecb3",
        "Block site", () => { block.add(h); allow.delete(h); set(KEY_BLOCK, [...block]); set(KEY_ALLOW, [...allow]); });
      return F.apply(this, arguments);
    }
    return new Promise((resolve, reject) => {
      prompt(h, `fetch → ${leak}`,
        () => F.apply(this, arguments).then(resolve).catch(reject),
        () => reject(new Error("Blocked by DLD")));
    });
  }
  return F.apply(this, arguments);
};

/* ====== 7. XHR patch ====== */
const XO = XMLHttpRequest.prototype.open;
const XS = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (m, u) { this._dld_url = u; return XO.apply(this, arguments); };
XMLHttpRequest.prototype.send = function (body) {
  const url = this._dld_url, h = hname(url), leak = detect(toStr(body));
  if (leak && url && third(url)) {
    if (block.has(h)) {
      showSidePopup(h, "Blocked request to this site.", "#ffcdd2",
        "Unblock site", () => { allow.add(h); block.delete(h); set(KEY_ALLOW, [...allow]); set(KEY_BLOCK, [...block]); });
      return;
    }
    if (allow.has(h)) {
      showSidePopup(h, "Site previously marked as false alarm.", "#ffecb3",
        "Block site", () => { block.add(h); allow.delete(h); set(KEY_BLOCK, [...block]); set(KEY_ALLOW, [...allow]); });
      return XS.call(this, body);
    }
    prompt(h, `XHR → ${leak}`,
      () => { XO.call(this, "POST", url); XS.call(this, body); },
      () => {});
    return;
  }
  return XS.call(this, body);
};

/* ====== 8. sendBeacon patch ====== */
if (navigator.sendBeacon) {
  const SB = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = function (url, data) {
    const h = hname(url), leak = detect(toStr(data));
    if (leak && third(url)) {
      if (block.has(h)) {
        showSidePopup(h, "Warning! You should close this tab. This site has tried to send information to a third party site which could be stealing data. We have blocked this request but advise you to stay away from this site.", "#ffcdd2",
          "Unblock site", () => { allow.add(h); block.delete(h); set(KEY_ALLOW, [...allow]); set(KEY_BLOCK, [...block]); });
        return false;
      }
      if (allow.has(h)) {
        showSidePopup(h, " Warning. This site has sent sensitive data to this site and you marked it as a false alarm. Be careful around this site", "#ffecb3",
          "Block site", () => { block.add(h); allow.delete(h); set(KEY_BLOCK, [...block]); set(KEY_ALLOW, [...allow]); });
        return SB(url, data);
      }
      prompt(h, `Beacon → ${leak}`,
        () => SB(url, data),
        () => {});
      return false;
    }
    return SB(url, data);
  };
}

console.log("[DLD] inject.js with block & unblock popup loaded");
})();
let enabledIDs = Object.keys(PATTERN_IDS); // fallback to all
chrome.storage.local.get("enabledPatterns", ({ enabledPatterns }) => {
  if (Array.isArray(enabledPatterns) && enabledPatterns.length) {
    enabledIDs = enabledPatterns;w
  }
});

const isHit = txt => {
  for (const id of enabledIDs) {
    const rx = PATTERN_IDS[id];
    if (rx && rx.test(txt)) return id;
  }
  return null;
};
// 🔄 Ask content script (detector.js) for the current enabled patterns
window.postMessage({ type: "GET_ENABLED_PATTERNS" }, "*");

// 🎯 Listen for the enabled patterns from detector.js
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;

  if (msg?.type === "ENABLED_PATTERNS_RESULT") {
    const enabledPatterns = msg.enabledPatterns || [];
    console.log("✅ Received enabled patterns:", enabledPatterns);

    // ✅ Put your pattern-detection logic here using enabledPatterns
  }
});
