const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../extension/popup.js"), "utf8");
const settle = () => new Promise(resolve => setImmediate(resolve));

async function setup(options = {}) {
  const ids = ["toggle", "status", "video-title", "automatic", "returnOnFocus", "keepQuality", "playerControls", "glassDesign", "language", "installation", "update-required", "reload-tab"];
  const elements = Object.fromEntries(ids.map(id => [id, {
    id, disabled: true, checked: false, hidden: true, textContent: "", handlers: {},
    addEventListener(name, callback) { this.handlers[name] = callback; }
  }]));
  const calls = [];
  const reloads = [];
  const state = {
    apiVersion: 10,
    language: "en",
    glassDesign: true,
    playerControls: true,
    automatic: true, returnOnFocus: true, keepQuality: true, autoSupported: true,
    supported: true, available: true, active: false, title: "Example video", status: "",
    ...options.state
  };
  const player = {
    getState: () => ({ ...state }),
    configure(next) { Object.assign(state, next); return { ...state }; },
    async open() {
      if (options.denyOpen) throw new Error("Permission denied");
      state.active = true;
    },
    async close() { state.active = false; }
  };
  player.toggle = async () => {
    if (state.active) await player.close();
    else await player.open();
    return { ...state };
  };
  const context = vm.createContext({
    URL,
    document: { querySelector: selector => elements[selector.slice(1)] },
    window: { __floatTube: player },
    chrome: {
      tabs: {
        query: async () => [{ id: 7, url: options.url || "https://www.youtube.com/watch?v=test" }],
        reload: async id => {
          if (options.denyReload) throw new Error("Tab closed");
          reloads.push(id);
        }
      },
      scripting: { executeScript: async request => {
        calls.push(request);
        if (request.files) return [{ result: undefined }];
        const func = vm.runInContext(`(${request.func.toString()})`, context);
        return [{ result: await func(...request.args) }];
      } }
    }
  });
  if (Object.hasOwn(options, "chrome")) context.chrome = options.chrome;
  vm.runInContext(source, context);
  await settle();
  return { elements, calls, state, reloads };
}

test("popup connects to YouTube and opens/closes the player", async () => {
  const s = await setup();
  assert.equal(s.elements.toggle.disabled, false);
  assert.equal(s.elements["video-title"].textContent, "Example video");
  assert.deepEqual(Array.from(s.calls[0].files), ["locales.js", "pip-window.js", "player.js"]);
  await s.elements.toggle.handlers.click();
  assert.equal(s.state.active, true);
  assert.match(s.elements.toggle.textContent, /Return/);
  await s.elements.toggle.handlers.click();
  assert.equal(s.state.active, false);
});

test("other websites do not receive an injected script", async () => {
  for (const url of ["https://example.com", "https://www.youtube.com.evil.test", "about:blank"]) {
    const s = await setup({ url });
    assert.equal(s.calls.length, 0);
    assert.equal(s.elements.toggle.disabled, true);
    assert.match(s.elements.status.textContent, /youtube.com/);
  }
});

test("empty video and unsupported automatic mode have disabled controls", async () => {
  const s = await setup({ state: { available: false, autoSupported: false } });
  assert.equal(s.elements.toggle.disabled, true);
  assert.equal(s.elements.automatic.disabled, true);
  assert.equal(s.elements.returnOnFocus.disabled, true);
});

test("popup renders native permission errors and permits retry", async () => {
  const s = await setup({ denyOpen: true });
  await s.elements.toggle.handlers.click();
  assert.equal(s.elements.status.textContent, "Permission denied");
  assert.equal(s.elements.toggle.disabled, false);
});

test("settings changes reach the page and update controls", async () => {
  const s = await setup();
  s.elements.automatic.checked = false;
  await s.elements.automatic.handlers.change();
  assert.equal(s.state.automatic, false);
  assert.equal(s.elements.automatic.checked, false);
  assert.equal(s.elements.automatic.disabled, false);
});

test("Keep video quality can be turned off from the popup", async () => {
  const s = await setup();
  assert.equal(s.elements.keepQuality.checked, true);
  assert.equal(s.elements.keepQuality.disabled, false);
  s.elements.keepQuality.checked = false;
  await s.elements.keepQuality.handlers.change();
  assert.equal(s.state.keepQuality, false);
  s.elements.keepQuality.checked = true;
  await s.elements.keepQuality.handlers.change();
  assert.equal(s.state.keepQuality, true);
  assert.equal(s.elements.keepQuality.checked, true);
});

test("old page scripts show a refresh action rather than silently resetting quality", async () => {
  const s = await setup({ state: { apiVersion: undefined, keepQuality: undefined } });
  assert.equal(s.elements["update-required"].hidden, false);
  assert.equal(s.elements.keepQuality.disabled, true);
  assert.equal(s.elements.automatic.disabled, true);
  assert.match(s.elements.status.textContent, /older SideView script/);
  await s.elements["reload-tab"].handlers.click();
  assert.deepEqual(s.reloads, [7]);
  assert.match(s.elements.status.textContent, /reloading/);
});

test("failed tab reload offers the manual F5 fallback", async () => {
  const s = await setup({ state: { apiVersion: undefined }, denyReload: true });
  await s.elements["reload-tab"].handlers.click();
  assert.equal(s.elements["reload-tab"].disabled, false);
  assert.match(s.elements.status.textContent, /F5/);
});

test("popup displays quality control limitations from the player", async () => {
  const s = await setup({ state: { qualityWarning: "Quality control is unavailable." } });
  assert.match(s.elements.status.textContent, /Quality control is unavailable/);
});

test("Glass design switch saves the chosen appearance", async () => {
  const s = await setup();
  assert.equal(s.elements.glassDesign.checked, true);
  s.elements.glassDesign.checked = false;
  await s.elements.glassDesign.handlers.change();
  assert.equal(s.state.glassDesign, false);
  assert.equal(s.elements.glassDesign.checked, false);
});

test("language selector updates the page preference", async () => {
  const s = await setup();
  s.elements.language.value = "ru";
  await s.elements.language.handlers.change();
  assert.equal(s.state.language, "ru");
  assert.equal(s.elements.language.value, "ru");
  assert.equal(s.elements.language.disabled, false);
});

test("button uses live page state if the browser closed PiP after popup initialization", async () => {
  const s = await setup({ state: { active: true } });
  assert.match(s.elements.toggle.textContent, /Return/);
  s.state.active = false;
  await s.elements.toggle.handlers.click();
  assert.equal(s.state.active, true, "a stale popup must reopen PiP rather than close an absent window");
});

test("popup uses textContent for untrusted video titles", async () => {
  const title = '<img src=x onerror="alert(1)">';
  const s = await setup({ state: { title } });
  assert.equal(s.elements["video-title"].textContent, title);
  assert.equal(s.elements["video-title"].innerHTML, undefined);
});

test("opening popup as a regular page shows installation instructions without API errors", async () => {
  for (const chrome of [undefined, {}, { tabs: {} }, { tabs: { query() {} } }]) {
    const s = await setup({ chrome });
    assert.equal(s.calls.length, 0);
    assert.equal(s.elements.toggle.disabled, true);
    assert.equal(s.elements.installation.hidden, false);
    assert.match(s.elements["video-title"].textContent, /Install/);
    assert.match(s.elements.status.textContent, /popup.html/);
    assert.doesNotMatch(s.elements.status.textContent, /undefined|Cannot read/);
  }
});
