/*
 * Dimly Theme — service worker
 * Keeps a small badge in sync so you can see at a glance whether the active
 * tab's origin is themed.
 */

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

async function refreshBadge(tab) {
  if (!tab || !tab.url) return;
  const origin = originOf(tab.url);
  if (!origin) return;
  const res = await chrome.storage.local.get([origin]);
  const on = Boolean(res[origin]);
  chrome.action.setBadgeText({ tabId: tab.id, text: on ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#6d5efc" });
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  refreshBadge(tab);
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "complete") refreshBadge(tab);
});
