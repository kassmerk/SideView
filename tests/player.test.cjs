const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../extension/player.js"), "utf8");

function setup(options = {}) {
  const listeners = new Map();
  const handlers = new Map();
  const values = new Map(Object.entries(options.storage || {}));
  const qualityIntervals = new Map();
  let intervalId = 0;
  let requests = 0;
  let exits = 0;
  const video = {
    readyState: 4, videoWidth: 1920, paused: false, ended: false,
    disablePictureInPicture: true,
    matches: () => true,
    async requestPictureInPicture() {
      requests++;
      if (options.reject) throw Object.assign(new Error("denied"), { name: options.reject });
      if (options.beforeOpen) await options.beforeOpen();
      document.pictureInPictureElement = video;
    },
    ...options.video
  };
  const document = {
    hidden: false, pictureInPictureEnabled: true, pictureInPictureElement: null,
    title: "Test video - YouTube",
    querySelector: () => options.qualityPlayer || null,
    querySelectorAll: () => options.noVideo ? [] : [video],
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    async exitPictureInPicture() {
      exits++;
      if (options.beforeClose) await options.beforeClose();
      if (options.closeError) throw Object.assign(new Error("already closed"), { name: "InvalidStateError" });
      document.pictureInPictureElement = null;
      emit("leavepictureinpicture", { target: video });
    }
  };
  function emit(name, event) { for (const callback of listeners.get(name) || []) callback(event); }
  if (options.closeWhenDisabled) {
    let disabled = video.disablePictureInPicture;
    Object.defineProperty(video, "disablePictureInPicture", {
      get: () => disabled,
      set(value) {
        disabled = value;
        if (value && document.pictureInPictureElement === video) {
          document.pictureInPictureElement = null;
          emit("leavepictureinpicture", { target: video });
        }
      }
    });
  }
  const context = vm.createContext({
    setTimeout, clearTimeout,
    setInterval(callback) { qualityIntervals.set(++intervalId, callback); return intervalId; },
    clearInterval(id) { qualityIntervals.delete(id); },
    window: options.window || {}, document,
    navigator: { mediaSession: { setActionHandler(name, callback) {
      if (options.unsupportedAuto) throw new TypeError("unsupported");
      handlers.set(name, callback);
    } } },
    localStorage: {
      getItem: key => values.get(key),
      setItem: (key, value) => {
        if (options.storageDenied) throw new Error("storage denied");
        values.set(key, value);
      }
    }
  });
  vm.runInContext(source, context);
  return {
    api: context.window.__floatTube, context, document, video, emit, values,
    auto: () => handlers.get("enterpictureinpicture")({ reason: "contentoccluded" }),
    requests: () => requests, exits: () => exits,
    tickQuality: () => { for (const callback of [...qualityIntervals.values()]) callback(); },
    qualityIntervals
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("manual PiP restores the site's disable flag only after exit", async () => {
  const s = setup();
  await s.api.open();
  assert.equal(s.requests(), 1);
  assert.equal(s.document.pictureInPictureElement, s.video);
  assert.equal(s.video.disablePictureInPicture, false);
  assert.equal(s.api.getState().title, "Test video");
  await s.api.close();
  assert.equal(s.exits(), 1);
  assert.equal(s.video.disablePictureInPicture, true);
});

test("browser Auto PiP closes on return when enabled", async () => {
  const s = setup();
  s.document.hidden = true;
  s.auto();
  await settle();
  assert.equal(s.requests(), 1);
  s.document.hidden = false;
  s.emit("visibilitychange");
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(s.exits(), 1);
});

test("manually opened PiP remains on return to the tab", async () => {
  const s = setup();
  await s.api.open();
  s.emit("visibilitychange");
  assert.equal(s.exits(), 0);
});

test("automatic opening respects the off switch and paused videos", async () => {
  const s = setup();
  s.document.hidden = true;
  s.api.configure({ automatic: false });
  s.auto();
  await settle();
  assert.equal(s.requests(), 0);
  s.api.configure({ automatic: true });
  s.video.paused = true;
  s.auto();
  await settle();
  assert.equal(s.requests(), 0);
});

test("closing PiP while hidden suppresses automatic reopening until return", async () => {
  const s = setup();
  s.document.hidden = true;
  s.auto();
  await settle();
  await s.api.close();
  s.auto();
  await settle();
  assert.equal(s.requests(), 1);
  s.document.hidden = false;
  s.emit("visibilitychange");
  s.document.hidden = true;
  s.auto();
  await settle();
  assert.equal(s.requests(), 2);
});

test("returnOnFocus off keeps automatic PiP open", async () => {
  const s = setup();
  s.api.configure({ returnOnFocus: false });
  s.document.hidden = true;
  s.auto();
  await settle();
  s.document.hidden = false;
  s.emit("visibilitychange");
  assert.equal(s.exits(), 0);
});

test("permission rejection is actionable and restores the video flag", async () => {
  const s = setup({ reject: "NotAllowedError" });
  await assert.rejects(s.api.open(), /browser blocked/);
  assert.equal(s.video.disablePictureInPicture, true);
  assert.match(s.api.getState().status, /site settings/);
  await assert.rejects(s.api.open());
  assert.equal(s.requests(), 2, "a rejected request must release the opening lock");
});

test("missing or unloaded video returns an explanation", async () => {
  for (const options of [{ noVideo: true }, { video: { videoWidth: 0 } }]) {
    const s = setup(options);
    assert.equal(s.api.getState().available, false);
    await assert.rejects(s.api.open(), /Open a YouTube video first/);
  }
});

test("manual PiP still works when automatic API is unavailable", async () => {
  const s = setup({ unsupportedAuto: true });
  assert.equal(s.api.getState().autoSupported, false);
  await s.api.open();
  assert.equal(s.requests(), 1);
});

test("duplicate injection is idempotent", () => {
  const s = setup();
  const original = s.api;
  vm.runInContext(source, s.context);
  assert.equal(s.context.window.__floatTube, original);
});

test("settings validate persisted values and survive reload", () => {
  const s = setup({ storage: { "floattube.preferences.v1": '{"automatic":false,"returnOnFocus":"invalid"}' } });
  assert.equal(s.api.getState().automatic, false);
  assert.equal(s.api.getState().returnOnFocus, true);
  s.api.configure({ automatic: true, returnOnFocus: false, unknown: true });
  const saved = JSON.parse(s.values.get("floattube.preferences.v1"));
  assert.deepEqual(saved, { automatic: true, returnOnFocus: false, keepQuality: true, playerControls: true, glassDesign: true, language: "en" });
});

test("language saves across reloads and rejects unsupported values", () => {
  const s = setup();
  s.api.configure({ language: "ru" });
  assert.equal(s.api.getState().language, "ru");
  const reloaded = setup({ storage: Object.fromEntries(s.values) });
  assert.equal(reloaded.api.getState().language, "ru");
  reloaded.api.configure({ language: true });
  assert.equal(reloaded.api.getState().language, "ru");
  reloaded.api.configure({ language: "de" });
  assert.equal(reloaded.api.getState().language, "ru");
  reloaded.api.configure({ language: "en" });
  assert.equal(reloaded.api.getState().language, "en");
});

test("malformed or denied site storage does not break playback", async () => {
  const s = setup({ storage: { "floattube.preferences.v1": "invalid json" }, storageDenied: true });
  assert.equal(s.api.getState().automatic, true);
  s.api.configure({ automatic: false });
  assert.match(s.api.getState().status, /until you reload/);
  await s.api.open();
  assert.equal(s.requests(), 1);
});

test("concurrent requests open only one window and handle a quick return", async () => {
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const s = setup({ beforeOpen: () => waiting });
  s.document.hidden = true;
  const first = s.api.open(true);
  await s.api.open(true);
  s.document.hidden = false;
  s.emit("visibilitychange");
  release();
  await first;
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(s.requests(), 1);
  assert.equal(s.exits(), 1);
});

test("disablePictureInPicture cannot close a newly opened native window", async () => {
  const s = setup({ closeWhenDisabled: true });
  await s.api.open();
  assert.equal(s.document.pictureInPictureElement, s.video);
  assert.equal(s.video.disablePictureInPicture, false);
  await s.api.close();
  assert.equal(s.video.disablePictureInPicture, true);
  await s.api.open();
  assert.equal(s.document.pictureInPictureElement, s.video);
});

test("repeated tab switches allow automatic and manual PiP to reopen", async () => {
  const s = setup({ closeWhenDisabled: true });
  for (let i = 0; i < 3; i++) {
    s.document.hidden = true;
    s.emit("visibilitychange");
    s.auto();
    await settle();
    assert.equal(s.api.getState().active, true);
    s.document.hidden = false;
    s.emit("visibilitychange");
    await new Promise(resolve => setTimeout(resolve, 120));
    assert.equal(s.api.getState().active, false);
    await s.api.toggle();
    assert.equal(s.api.getState().active, true);
    await s.api.toggle();
  }
});

test("a late automatic callback on the visible tab does not reopen PiP", async () => {
  const s = setup();
  s.auto();
  await settle();
  assert.equal(s.requests(), 0);
});

test("the native browser exit wins over the delayed fallback", async () => {
  const s = setup();
  s.document.hidden = true;
  s.auto();
  await settle();
  s.document.hidden = false;
  s.emit("visibilitychange");
  s.document.pictureInPictureElement = null;
  s.emit("leavepictureinpicture", { target: s.video });
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(s.exits(), 0);
  assert.equal(s.video.disablePictureInPicture, true);
  await s.api.toggle();
  assert.equal(s.api.getState().active, true);
});

test("switching away again cancels the scheduled return", async () => {
  const s = setup();
  s.document.hidden = true;
  s.auto();
  await settle();
  s.document.hidden = false;
  s.emit("visibilitychange");
  s.document.hidden = true;
  s.emit("visibilitychange");
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(s.exits(), 0);
  assert.equal(s.api.getState().active, true);
});

test("concurrent close calls share a single browser exit", async () => {
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const s = setup({ beforeClose: () => waiting });
  await s.api.open();
  const first = s.api.close();
  const second = s.api.close();
  assert.equal(s.exits(), 1);
  release();
  await Promise.all([first, second]);
  await s.api.open();
  assert.equal(s.api.getState().active, true);
});

test("active video stays recoverable while dimensions are temporarily zero", async () => {
  const s = setup();
  await s.api.open();
  s.video.videoWidth = 0;
  assert.equal(s.api.getState().available, true);
  await s.api.toggle();
  assert.equal(s.api.getState().active, false);
});

test("SPA navigation and playback re-register the automatic action", () => {
  const s = setup();
  s.emit("yt-navigate-finish");
  s.emit("play");
  assert.equal(s.api.getState().autoSupported, true);
});

test("manifest only requests the capabilities used by the extension", () => {
  const root = require("node:path").join(__dirname, "../extension");
  const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`, "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting"]);
  for (const script of manifest.content_scripts[0].js) assert.ok(fs.existsSync(`${root}/${script}`));
  assert.ok(fs.existsSync(`${root}/${manifest.action.default_popup}`));
});

function makeQualityPlayer() {
  return {
    current: "hd1080", videoId: "first", calls: [], ignore: false,
    levels: ["hd1080", "hd720", "medium"],
    getPlaybackQuality() { return this.current; },
    getVideoData() { return { video_id: this.videoId }; },
    getAvailableQualityLevels() { return this.levels; },
    setPlaybackQualityRange(min, max) {
      this.calls.push([min, max]);
      if (!this.ignore) this.current = min;
    }
  };
}

function makeCustomWindow(fail = false) {
  const window = { documentPictureInPicture: { requestWindow() {} } };
  const sessions = [];
  window.__floatTubeWindow = {
    async open(options) {
      if (fail) throw new Error("Document PiP unavailable");
      const session = {
        video: options.video, isOpen: true, options,
        close() { this.isOpen = false; options.onClose(); }
      };
      sessions.push(session);
      return session;
    }
  };
  return { window, sessions };
}

test("custom controls use Document PiP and close back into the same tab", async () => {
  const custom = makeCustomWindow();
  const s = setup({ window: custom.window });
  await s.api.open();
  assert.equal(s.requests(), 0);
  assert.equal(s.api.getState().active, true);
  assert.equal(s.api.getState().apiVersion, 10);
  await s.api.toggle();
  assert.equal(s.api.getState().active, false);
  await s.api.toggle();
  assert.equal(custom.sessions.length, 2);
  custom.sessions[1].close();
  assert.equal(s.api.getState().active, false);
});

test("unsupported Document PiP falls back to native PiP", async () => {
  const custom = makeCustomWindow(true);
  const s = setup({ window: custom.window });
  await s.api.open();
  assert.equal(s.requests(), 1);
  assert.equal(s.api.getState().active, true);
  assert.match(s.api.getState().status, /standard mini player/);
});

test("Player controls off uses the native window even when Document PiP is supported", async () => {
  const custom = makeCustomWindow();
  const s = setup({ window: custom.window });
  s.api.configure({ playerControls: false });
  await s.api.open();
  assert.equal(s.requests(), 1);
  assert.equal(custom.sessions.length, 0);
});

test("custom quality menu changes the pinned quality and Auto releases enforcement", async () => {
  const custom = makeCustomWindow();
  const player = makeQualityPlayer();
  const s = setup({ window: custom.window, qualityPlayer: player });
  await s.api.open();
  const ui = custom.sessions[0].options;
  assert.equal(ui.getQualities().selected, "hd1080");
  ui.selectQuality("hd720");
  assert.equal(player.current, "hd720");
  player.current = "medium";
  s.tickQuality();
  assert.equal(player.current, "hd720");
  ui.selectQuality("auto");
  assert.equal(player.current, "auto");
  assert.equal(s.api.getState().keepQuality, false);
  assert.equal(s.qualityIntervals.size, 0);
  assert.throws(() => ui.selectQuality("hd2160"));
  custom.sessions[0].close();
});

test("automatic Document PiP returns on focus and can reopen", async () => {
  const custom = makeCustomWindow();
  const s = setup({ window: custom.window });
  s.document.hidden = true;
  s.auto();
  await settle();
  assert.equal(s.api.getState().active, true);
  s.document.hidden = false;
  s.emit("visibilitychange");
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(s.api.getState().active, false);
  await s.api.open();
  assert.equal(s.api.getState().active, true);
});

test("PiP requests the current resolution without upgrading to a higher tier", async () => {
  const player = makeQualityPlayer();
  player.current = "hd720";
  const s = setup({ qualityPlayer: player });
  await s.api.open();
  assert.deepEqual(player.calls, [["hd720", "hd720"]]);
  assert.equal(s.qualityIntervals.size, 1);
  await s.api.close();
  assert.equal(s.qualityIntervals.size, 0);
  player.current = "medium";
  s.tickQuality();
  assert.equal(player.calls.length, 1, "quality enforcement stops outside PiP");
});

test("automatic PiP preserves the last visible quality if YouTube lowers it in background", async () => {
  const player = makeQualityPlayer();
  const s = setup({ qualityPlayer: player });
  player.current = "medium";
  s.document.hidden = true;
  s.auto();
  await settle();
  assert.equal(player.current, "hd1080");
  player.current = "medium";
  s.tickQuality();
  assert.equal(player.current, "hd1080");
});

test("disabling Keep video quality stops requests immediately", async () => {
  const player = makeQualityPlayer();
  const s = setup({ qualityPlayer: player });
  await s.api.open();
  s.api.configure({ keepQuality: false });
  player.current = "medium";
  s.tickQuality();
  assert.equal(player.current, "medium");
  assert.equal(s.qualityIntervals.size, 0);
  await s.api.close();
  await s.api.open();
  assert.equal(player.calls.length, 1);
});

test("quality APIs are optional and cannot prevent PiP from opening", async () => {
  for (const qualityPlayer of [null, {}, { getAvailableQualityLevels() { throw new Error("changed API"); } }]) {
    const s = setup({ qualityPlayer });
    await s.api.open();
    assert.equal(s.api.getState().active, true);
    assert.match(s.api.getState().qualityWarning, /unavailable/);
    assert.equal(s.qualityIntervals.size, 0);
  }
});

test("a no-op quality setter is reported instead of claiming a successful lock", async () => {
  const player = makeQualityPlayer();
  const s = setup({ qualityPlayer: player });
  player.current = "medium";
  player.ignore = true;
  s.document.hidden = true;
  s.auto();
  await settle();
  assert.match(s.api.getState().qualityWarning, /has not applied/);
  assert.equal(player.current, "medium");
});

test("quality enforcement is cleared when a new video starts in the same player", async () => {
  const player = makeQualityPlayer();
  const s = setup({ qualityPlayer: player });
  await s.api.open();
  player.videoId = "second";
  player.current = "medium";
  s.tickQuality();
  assert.equal(player.calls.length, 1);
  assert.equal(s.qualityIntervals.size, 0);
});

test("unavailable resolutions are not forced onto the stream", async () => {
  const player = makeQualityPlayer();
  const s = setup({ qualityPlayer: player });
  await s.api.open();
  player.levels = ["medium"];
  player.current = "medium";
  s.tickQuality();
  assert.equal(player.calls.length, 1);
  assert.match(s.api.getState().qualityWarning, /no longer available/);
});

test("rejected PiP requests never start quality enforcement", async () => {
  const player = makeQualityPlayer();
  const s = setup({ qualityPlayer: player, reject: "NotAllowedError" });
  await assert.rejects(s.api.open());
  assert.equal(player.calls.length, 0);
  assert.equal(s.qualityIntervals.size, 0);
});
