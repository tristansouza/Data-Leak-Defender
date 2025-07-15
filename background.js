const PATTERN_IDS = {
  "SSN": "ssn",
  "Email": "email",
  "Phone": "phone",
  "CreditCard": "cc",
  "IBAN": "iban",
  "VIN": "vin",
  "DL_US": "dlus",
  "Passport_US": "passportus",
  "HomeAddress": "address",
  "DOB": "dob",
  "POB": "pob",
  "Employment": "employment"
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("enabledPatterns", (data) => {
    if (!Array.isArray(data.enabledPatterns)) {
      chrome.storage.local.set({ enabledPatterns: Object.keys(PATTERN_IDS) });
    }
  });

  chrome.storage.local.get(['whitelist', 'logs', 'dld_paused'], (data) => {
    if (!data.whitelist) chrome.storage.local.set({ whitelist: ["google.com", "edge.com", "firefox.com", "opera.com"] });
    if (!data.logs) chrome.storage.local.set({ logs: [] });
    if (data.dld_paused === undefined) chrome.storage.local.set({ dld_paused: false });
  });
});

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "CHECK_WHITELIST") {
    const { whitelist = [] } = await chrome.storage.local.get('whitelist');
    const hostname = new URL(sender.tab.url).hostname;
    sendResponse({ allowed: whitelist.includes(hostname) });
    return true;
  }

  if (msg.type === "POTENTIAL_LEAK") {
    const { url, dataType, dataSample } = msg;
    const { whitelist = [], dld_paused = false } = await chrome.storage.local.get(['whitelist', 'dld_paused']);
    const hostname = new URL(url).hostname;

    if (whitelist.includes(hostname) || dld_paused) return;

    const { logs = [] } = await chrome.storage.local.get('logs');
    logs.unshift({
      time: new Date().toISOString(),
      url,
      dataType,
      dataSample,
      action: "alerted"
    });
    if (logs.length > 1000) logs.pop();
    await chrome.storage.local.set({ logs });

    chrome.notifications.create('leak_alert', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Data Leak Defender Alert',
      message: `⚠️ Potential ${dataType.toUpperCase()} leak detected on ${hostname}`,

      buttons: [
        { title: "Pause Protection" },
        { title: "Add site to whitelist" },
        { title: "Report false positive" }
      ],
      priority: 2
    });
  }

  if (msg.type === "REPORT_FALSE_POSITIVE") {
    const { logs = [] } = await chrome.storage.local.get('logs');
    logs.unshift({
      time: new Date().toISOString(),
      url: msg.url,
      dataType: msg.dataType,
      dataSample: msg.dataSample,
      action: "reported_false_positive"
    });
    await chrome.storage.local.set({ logs });
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Thank you!",
      message: "False positive report submitted."
    });
  }

  if (msg.type === "TOGGLE_PAUSE") {
    const { dld_paused = false } = await chrome.storage.local.get('dld_paused');
    const newState = !dld_paused;
    await chrome.storage.local.set({ dld_paused: newState });
    sendResponse({ paused: newState });
    return true;
  }

  if (msg.type === "GET_PAUSE_STATUS") {
    const { dld_paused = false } = await chrome.storage.local.get('dld_paused');
    sendResponse({ paused: dld_paused });
    return true;
  }
});

chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  if (notifId !== 'leak_alert') return;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) return;
  const tab = tabs[0];
  const hostname = new URL(tab.url).hostname;

  if (btnIdx === 0) {
    await chrome.storage.local.set({ dld_paused: true });
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Protection Paused",
      message: "Protection paused by user."
    });
  } else if (btnIdx === 1) {
    const { whitelist = [] } = await chrome.storage.local.get('whitelist');
    if (!whitelist.includes(hostname)) {
      whitelist.push(hostname);
      await chrome.storage.local.set({ whitelist });
    }
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Site Whitelisted",
      message: `${hostname} added to whitelist.`
    });
  } else if (btnIdx === 2) {
    chrome.runtime.openOptionsPage();
  }

  chrome.notifications.clear(notifId);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SET_BADGE') {
    // Skip badge-related logic on Firefox
    if (typeof InstallTrigger !== 'undefined') return;

    try {
      if (msg.paused) {
        chrome.action.setBadgeText({ text: 'II' });
        chrome.action.setBadgeBackgroundColor({ color: '#616161' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    } catch (e) {
      console.warn("Badge API not supported in this browser.");
    }
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "DLD_DECISION") {
    chrome.storage.local.get(['whitelist', 'blocklist'], (d) => {
      const wl = new Set(d.whitelist || []);
      const bl = new Set(d.blocklist || []);

      if (msg.action === "allow") {
        wl.add(msg.host);
        bl.delete(msg.host);
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "False Alarm Recorded",
          message: `${msg.host} added to whitelist.`
        });
      } else if (msg.action === "block") {
        bl.add(msg.host);
        wl.delete(msg.host);
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Request Blocked",
          message: `Future leaks to ${msg.host} will be blocked.`
        });
      }

      chrome.storage.local.set({ whitelist: [...wl], blocklist: [...bl] });
    });
  }
});
