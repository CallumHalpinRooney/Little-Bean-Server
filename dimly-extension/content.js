/*
 * Dimly Theme — content script
 * Injects the stylesheet once and toggles the `dimly-themed` class on <html>
 * based on per-origin state stored in chrome.storage. Runs at document_start
 * so there is no flash of the unthemed page when the theme is enabled.
 */
(() => {
  const STYLE_ID = "dimly-theme-style";
  const origin = location.origin;

  function injectStylesheet() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("theme.css");
    (document.head || document.documentElement).appendChild(link);
  }

  function apply(enabled) {
    const root = document.documentElement;
    if (enabled) {
      injectStylesheet();
      root.classList.add("dimly-themed");
    } else {
      root.classList.remove("dimly-themed");
    }
  }

  // Initial state: read this origin's saved preference.
  chrome.storage.local.get([origin], (res) => {
    apply(Boolean(res[origin]));
  });

  // React to toggles from the popup (broadcast for this origin).
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "dimly:set" && msg.origin === origin) {
      apply(Boolean(msg.enabled));
    }
  });
})();
