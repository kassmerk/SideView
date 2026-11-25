"use strict";
const toggle = document.querySelector("#toggle");
const status = document.querySelector("#status");
const title = document.querySelector("#video-title");
const automatic = document.querySelector("#automatic");
const returnOnFocus = document.querySelector("#returnOnFocus");
const keepQuality = document.querySelector("#keepQuality");
const playerControls = document.querySelector("#playerControls");
const glassDesign = document.querySelector("#glassDesign");
const reloadTab = document.querySelector("#reload-tab");
const languageSelect = document.querySelector("#language");
let tabId;
let state;
let language = "en";
const i18n = globalThis.FloatTubeI18n;
function localize() {
  if (document.documentElement) document.documentElement.lang = language;
  i18n?.localize(document.body, language);
}
i18n?.watch(document.body, () => language);

async function callPlayer(method, argument) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (name, value) => {
      const player = window.__floatTube;
      if (!player) return { error: "Reload the YouTube tab after installing the extension." };
      try { return { value: await player[name](value) }; }
      catch (error) { return { error: error.message || "Unable to complete this action." }; }
    },
    args: [method, argument ?? null]
  });
  const result = results[0]?.result;
  if (!result || result.error) throw new Error(result?.error || "This tab is unavailable. Open YouTube again.");
  return result.value;
}

function render(next) {
  if (next?.apiVersion !== 10 || typeof next.keepQuality !== "boolean") {
    toggle.disabled = true;
    toggle.textContent = "Refresh your YouTube tab";
    for (const control of [automatic, returnOnFocus, keepQuality, playerControls, glassDesign]) control.disabled = true;
    status.textContent = "This tab is running an older SideView script. Reload YouTube to enable the updated settings.";
    document.querySelector("#update-required").hidden = false;
    return;
  }
  state = next;
  language = state.language === "ru" ? "ru" : "en";
  languageSelect.value = language;
  languageSelect.disabled = false;
  document.querySelector("#update-required").hidden = true;
  title.textContent = state.available ? state.title : "Play a video on YouTube";
  toggle.textContent = state.active ? "Return video to tab" : "Open mini player ↗";
  toggle.disabled = !state.supported || (!state.active && !state.available);
  automatic.checked = state.automatic;
  returnOnFocus.checked = state.returnOnFocus;
  keepQuality.checked = state.keepQuality;
  keepQuality.disabled = !state.supported;
  playerControls.checked = state.playerControls;
  playerControls.disabled = !state.supported;
  glassDesign.checked = state.glassDesign;
  glassDesign.disabled = !state.supported;
  automatic.disabled = !state.autoSupported;
  returnOnFocus.disabled = !state.autoSupported;
  status.textContent = state.status || state.qualityWarning || (!state.supported
    ? "This browser does not support picture-in-picture."
    : !state.autoSupported ? "Manual mode is available. This browser does not support automatic PiP."
    : state.active ? "Mini player is open. You can minimize your browser." : "Automatic PiP requires permission from your browser.");
  localize();
}

languageSelect.addEventListener("change", async () => {
  languageSelect.disabled = true;
  try { render(await callPlayer("configure", { language: languageSelect.value })); }
  catch (error) {
    languageSelect.value = language;
    status.textContent = error.message;
  }
  finally { languageSelect.disabled = false; localize(); }
});

reloadTab.addEventListener("click", async () => {
  reloadTab.disabled = true;
  try {
    await chrome.tabs.reload(tabId);
    status.textContent = "YouTube is reloading. Open SideView again once the video has loaded.";
  } catch {
    reloadTab.disabled = false;
    status.textContent = "Unable to reload the tab. Switch to YouTube and press F5, then open SideView again.";
  }
});

toggle.addEventListener("click", async () => {
  toggle.disabled = true;
  try {
    render(await callPlayer("toggle"));
  } catch (error) {
    status.textContent = error.message;
    toggle.disabled = false;
  }
});

for (const control of [automatic, returnOnFocus, keepQuality, playerControls, glassDesign]) {
  let saving = false;
  control.addEventListener("change", async () => {
    if (saving) {
      control.checked = state[control.id];
      return;
    }
    const previous = state[control.id];
    saving = true;
    try { render(await callPlayer("configure", { [control.id]: control.checked })); }
    catch (error) {
      control.checked = previous;
      status.textContent = error.message;
    }
    finally { saving = false; }
  });
}

async function init() {
  if (typeof globalThis.chrome?.tabs?.query !== "function"
      || typeof globalThis.chrome?.scripting?.executeScript !== "function") {
    title.textContent = "Install SideView as an extension";
    toggle.textContent = "Open SideView from your toolbar";
    toggle.disabled = true;
    status.textContent = "This page has no access to extension APIs. Opening popup.html as a regular file will not run the mini player. Follow the steps below.";
    document.querySelector("#installation").hidden = false;
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || "about:blank");
    if (url.protocol !== "https:" || !["www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      toggle.textContent = "Open a YouTube tab";
      status.textContent = "Go to youtube.com, play a video and click the SideView icon.";
      return;
    }
    tabId = tab.id;
    // Also supports YouTube tabs that were open before extension installation.
    await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", files: ["locales.js", "pip-window.js", "player.js"] });
    render(await callPlayer("getState"));
  } catch (error) {
    toggle.textContent = "Unable to connect";
    status.textContent = error.message;
  }
}
void init();
