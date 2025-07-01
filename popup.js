document.addEventListener("DOMContentLoaded", () => {
  /* TAB HANDLING */
  const tabs     = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      contents.forEach(c => c.style.display = "none");
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).style.display = "block";
    });
  });

  /* PAUSE / RESUME */
  const pauseBtn  = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const statusTxt = document.getElementById("status");

  chrome.storage.local.get("dld_paused", ({ dld_paused = false }) => {
    updateStatus(dld_paused);
  });

  pauseBtn.onclick = () => togglePause(true);
  resumeBtn.onclick = () => togglePause(false);

  function togglePause(state) {
    chrome.storage.local.set({ dld_paused: state }, () => updateStatus(state));
  }

  function updateStatus(paused) {
    statusTxt.textContent = paused ? "Protection is paused." : "Protection is active.";
    pauseBtn.style.display  = paused ? "none" : "inline-block";
    resumeBtn.style.display = paused ? "inline-block" : "none";
  }

  /* ---- CUSTOMIZE TOGGLES ---- */

  const PATTERN_IDS = {
    phoneNumber: true,
    creditCardNumber: true,
    cryptoAddresses: true,
    emailAddress: true,
    ibanCodes: true,
    ipAddresses: true,
    gpsCoordinates: true,
    dateOfBirth: true,

    ssn: true,
    passportUS: true,
    cvv(4 digit on back of card): true,
    vin(Vehicle ID): false,
    drivers license: true,
    homeAddress: true,
    placeOfBirth: false,
    employmentInformation: false,
  };

  function prettifyKey(key) {
    return key.replace(/([A-Z])/g, " $1")
              .replace(/^./, str => str.toUpperCase());
  }

  const container = document.getElementById("toggleContainer");
  container.innerHTML = "Loading patterns...";

  // Initialize all toggles to checked by default on first run
  function initializeDefaultsIfNeeded(enabledPatterns) {
    if (!enabledPatterns || enabledPatterns.length === 0) {
      const allKeys = Object.keys(PATTERN_IDS);
      chrome.storage.local.set({ enabledPatterns: allKeys });
      return new Set(allKeys);
    }
    return new Set(enabledPatterns);
  }

  chrome.storage.local.get("enabledPatterns", ({ enabledPatterns }) => {
    const activePatterns = initializeDefaultsIfNeeded(enabledPatterns);

    container.innerHTML = ""; // Clear loading text

    for (const key of Object.keys(PATTERN_IDS)) {
      const checked = activePatterns.has(key);
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.marginBottom = "6px";

      label.innerHTML = `<input type="checkbox" class="toggle" data-type="${key}" ${checked ? "checked" : ""}> ${prettifyKey(key)}`;
      container.appendChild(label);
    }

    // Add event listeners for toggle changes
    container.querySelectorAll(".toggle").forEach(toggle => {
      toggle.addEventListener("change", () => {
        chrome.storage.local.get("enabledPatterns", ({ enabledPatterns }) => {
          const set = new Set(enabledPatterns || []);
          const type = toggle.dataset.type;
          if (toggle.checked) set.add(type);
          else set.delete(type);
          chrome.storage.local.set({ enabledPatterns: [...set] });
        });
      });
    });
  });
});