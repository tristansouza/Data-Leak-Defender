// ===== PATTERN LIST (all ON by default) =====
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
  internationalBankAccount: true,
  cvv: true,
  vin: true,
  dlUS: true,
  homeAddress: true,
  placeOfBirth: true,
  employmentInformation: true,
};

const prettify = k => k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

document.addEventListener("DOMContentLoaded", () => {

  /* ========= Tabs ========= */
  const tabs     = document.querySelectorAll(".tab");
  const panels   = document.querySelectorAll(".tab-content");
  tabs.forEach(tab=>{
    tab.addEventListener("click", ()=>{
      tabs.forEach(t=>t.classList.remove("active"));
      panels.forEach(p=>p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  /* ========= Pause / Resume ========= */
  const pauseBtn  = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const statusTxt = document.getElementById("status");

  function updateStatus(paused){
    statusTxt.textContent = paused? "Protection is paused." : "Protection is active.";
    pauseBtn.style.display  = paused? "none":"inline-block";
    resumeBtn.style.display = paused? "inline-block":"none";
  }
  chrome.storage.local.get("dld_paused", ({ dld_paused=false })=>updateStatus(dld_paused));
  pauseBtn.onclick  = ()=>chrome.storage.local.set({dld_paused:true},  ()=>updateStatus(true));
  resumeBtn.onclick = ()=>chrome.storage.local.set({dld_paused:false}, ()=>updateStatus(false));

  /* ========= Customize Toggles ========= */
  const container = document.getElementById("toggleContainer");

  // Ensure defaults saved once
  chrome.storage.local.get("enabledPatterns", ({ enabledPatterns })=>{
    if(!enabledPatterns || !enabledPatterns.length){
      chrome.storage.local.set({ enabledPatterns:Object.keys(PATTERN_IDS) });
      enabledPatterns = Object.keys(PATTERN_IDS);
    }
    buildToggleUI(new Set(enabledPatterns));
  });

  function buildToggleUI(activeSet){
    container.innerHTML = "";
    for(const key of Object.keys(PATTERN_IDS)){
      const checked = activeSet.has(key);
      const lbl = document.createElement("label");
      lbl.innerHTML = `<input type="checkbox" class="toggle" data-type="${key}" ${checked?"checked":""}> ${prettify(key)}`;
      container.appendChild(lbl);
    }
    container.querySelectorAll(".toggle").forEach(tg=>{
      tg.addEventListener("change", ()=>{
        chrome.storage.local.get("enabledPatterns", ({ enabledPatterns=[] })=>{
          const set=new Set(enabledPatterns);
          tg.checked? set.add(tg.dataset.type):set.delete(tg.dataset.type);
          chrome.storage.local.set({ enabledPatterns:[...set] });
        });
      });
    });
  }
});