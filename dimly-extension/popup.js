/*
 * Dimly Theme — popup logic
 * Toggles the theme for the active tab's origin and persists the choice.
 */

const toggle = document.getElementById("toggle");
const originEl = document.getElementById("origin");
const allBtn = document.getElementById("allBtn");

let currentOrigin = null;

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const tab = await getActiveTab();
  currentOrigin = tab ? originOf(tab.url) : null;

  if (!currentOrigin || currentOrigin === "null") {
    originEl.textContent = "Unavailable on this page";
    toggle.disabled = true;
    allBtn.disabled = true;
    return;
  }

  originEl.textContent = currentOrigin.replace(/^https?:\/\//, "");
  const res = await chrome.storage.local.get([currentOrigin]);
  toggle.checked = Boolean(res[currentOrigin]);
}

async function setOrigin(origin, enabled, tabId) {
  await chrome.storage.local.set({ [origin]: enabled });
  if (tabId != null) {
    chrome.tabs.sendMessage(tabId, { type: "dimly:set", origin, enabled });
  }
  chrome.action.setBadgeText({ tabId, text: enabled ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#6d5efc" });
}

toggle.addEventListener("change", async () => {
  const tab = await getActiveTab();
  if (!currentOrigin) return;
  await setOrigin(currentOrigin, toggle.checked, tab && tab.id);
});

allBtn.addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({});
  const updates = {};
  for (const tab of tabs) {
    const origin = originOf(tab.url);
    if (!origin || origin === "null") continue;
    updates[origin] = true;
    chrome.tabs.sendMessage(tab.id, { type: "dimly:set", origin, enabled: true });
    chrome.action.setBadgeText({ tabId: tab.id, text: "ON" });
  }
  await chrome.storage.local.set(updates);
  toggle.checked = true;
});

init();
