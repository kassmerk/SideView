const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../extension/pip-window.js"), "utf8");

class Node {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.events = new Map();
    this.className = "";
    this.textContent = "";
  }
  get isConnected() { return this.connected || Boolean(this.parentNode?.isConnected); }
  get classList() {
    const node = this;
    return {
      add(name) { this.toggle(name, true); },
      remove(name) { this.toggle(name, false); },
      toggle(name, value) {
        const set = new Set(node.className.split(" ").filter(Boolean));
        if (value ?? !set.has(name)) set.add(name); else set.delete(name);
        node.className = [...set].join(" ");
      }
    };
  }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  removeAttribute(key) { this.attributes.delete(key); }
  append(...nodes) {
    for (const node of nodes) {
      node.remove();
      node.parentNode = this;
      this.children.push(node);
    }
  }
  insertBefore(node, reference) {
    node.remove();
    const index = this.children.indexOf(reference);
    if (index < 0) throw new Error("Reference node not found");
    this.children.splice(index, 0, node);
    node.parentNode = this;
  }
  replaceChildren(...nodes) { for (const child of [...this.children]) child.remove(); this.append(...nodes); }
  replaceWith(node) { this.parentNode.insertBefore(node, this); this.remove(); }
  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }
  addEventListener(type, handler, options) {
    if (!this.events.has(type)) this.events.set(type, []);
    this.events.get(type).push({ handler, options });
  }
  removeEventListener(type, handler) {
    this.events.set(type, (this.events.get(type) || []).filter(item => item.handler !== handler));
  }
  async emit(type, event = {}) {
    const promises = [];
    for (const { handler, options } of [...this.events.get(type) || []]) {
      promises.push(handler({ target: this, preventDefault() {}, ...event }));
      if (options?.once) this.removeEventListener(type, handler);
    }
    await Promise.all(promises);
  }
}

function makeDocument(strict = false) {
  const doc = new Node("document");
  doc.connected = true;
  doc.documentElement = new Node("html");
  doc.head = new Node("head");
  doc.body = new Node("body");
  doc.append(doc.documentElement);
  doc.documentElement.append(doc.head, doc.body);
  doc.createElement = tag => {
    const node = new Node(tag);
    if (strict) Object.defineProperty(node, "innerHTML", {
      set() { throw new TypeError("This document requires TrustedHTML assignment."); }
    });
    return node;
  };
  doc.createElementNS = (namespace, tag) => {
    const node = doc.createElement(tag);
    node.namespaceURI = namespace;
    return node;
  };
  doc.createComment = () => new Node("comment");
  return doc;
}

async function setup(options = {}) {
  const original = makeDocument();
  const parent = original.createElement("div");
  const video = original.createElement("video");
  const sibling = original.createElement("span");
  video.controls = true;
  video.paused = false;
  video.muted = false;
  video.volume = .4;
  video.currentTime = 10;
  video.duration = options.live ? Infinity : 180;
  video.playbackRate = 1;
  video.textTracks = options.tracks || [];
  video.setAttribute("style", "width:900px;left:10px");
  video.play = async () => { video.paused = false; await video.emit("play"); };
  video.pause = () => { video.paused = true; void video.emit("pause"); };
  parent.append(video, sibling);
  original.body.append(parent);
  const pip = new Node("window");
  Object.assign(pip, { screenX: 400, screenY: 200, outerWidth: 560, screen: { availLeft: 0, availWidth: 1920 } }, options.position);
  pip.document = makeDocument(options.trustedTypes);
  pip.closed = false;
  pip.close = () => { pip.closed = true; void pip.emit("pagehide"); };
  const timers = new Map();
  const intervals = new Map();
  const selected = [];
  let current = "hd1080";
  let restores = 0;
  let focused = 0;
  const storage = options.storage || new Map();
  const context = vm.createContext({
    localStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value)
    },
    document: original,
    window: {
      focus() { focused++; },
      documentPictureInPicture: { requestWindow: async () => pip }
    },
    setTimeout(callback, delay) { const id = {}; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { const id = {}; intervals.set(id, { callback, delay }); return id; },
    clearInterval(id) { intervals.delete(id); }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../extension/locales.js"), "utf8"), context);
  vm.runInContext(source, context);
  const session = await context.window.__floatTubeWindow.open({
    video,
    captionPlayer: options.captionPlayer,
    getQualities: () => options.noQualities ? { levels: [] } : { levels: ["hd1080", "hd720"], selected: current },
    selectQuality(level) { selected.push(level); current = level; return ""; },
    onClose() { restores++; }
  });
  function nodes(root = pip.document) { return [root, ...root.children.flatMap(child => nodes(child))]; }
  function control(label) { return nodes().find(node => node.getAttribute("aria-label") === label); }
  return { session, pip, video, parent, sibling, timers, intervals, selected, nodes, control, restores: () => restores, focused: () => focused };
}

test("custom PiP moves the original video and restores its exact position and style", async () => {
  const s = await setup();
  assert.equal(s.video.parentNode.className, "surface");
  assert.equal(s.video.controls, false);
  assert.equal(s.video.currentTime, 10);
  assert.equal(s.video.volume, .4);
  s.session.close();
  assert.deepEqual(s.parent.children, [s.video, s.sibling]);
  assert.equal(s.video.controls, true);
  assert.equal(s.video.getAttribute("style"), "width:900px;left:10px");
  assert.equal(s.restores(), 1);
  assert.equal(s.timers.size, 0);
  assert.equal(s.session.isOpen, false);
  s.session.close();
  assert.equal(s.restores(), 1);
});

test("controls operate on playback, volume, mute and seek without another stream", async () => {
  const s = await setup();
  await s.control("Pause").emit("click");
  assert.equal(s.video.paused, true);
  await s.control("Play").emit("click");
  assert.equal(s.video.paused, false);
  const volume = s.control("Volume");
  volume.value = ".75";
  await volume.emit("input");
  assert.equal(s.video.volume, .75);
  await s.control("Mute").emit("click");
  assert.equal(s.video.muted, true);
  await s.control("Unmute").emit("click");
  assert.equal(s.video.muted, false);
  const seek = s.control("Seek video");
  seek.value = "120";
  await seek.emit("input");
  assert.equal(s.video.currentTime, 120);
  s.session.close();
});

function menuItem(s, label) {
  return s.nodes().find(node => node.tagName === "BUTTON" && node.children.some(child => child.textContent === label));
}

async function openQuality(s) {
  await s.control("Player settings").emit("click");
  await menuItem(s, "Quality").emit("click");
}

test("quality menu offers only available levels plus Auto and forwards selection", async () => {
  const s = await setup();
  await openQuality(s);
  const choices = s.nodes().filter(node => node.getAttribute("role") === "menuitemradio");
  assert.equal(choices.length, 3);
  assert.equal(choices[0].getAttribute("aria-checked"), "true");
  await choices[1].emit("click");
  assert.deepEqual(s.selected, ["hd720"]);
  const updated = s.nodes().filter(node => node.getAttribute("role") === "menuitemradio");
  await updated[2].emit("click");
  assert.deepEqual(s.selected, ["hd720", "auto"]);
  s.session.close();
});

test("native close and return-to-tab both restore the original video", async () => {
  const s = await setup();
  s.pip.close();
  assert.equal(s.video.parentNode, s.parent);
  assert.equal(s.restores(), 1);
  const other = await setup();
  await other.control("Return video to tab").emit("click");
  assert.equal(other.video.parentNode, other.parent);
  assert.equal(other.focused(), 1);
});

test("closing after page replacement does not attach stale video to a new player", async () => {
  const s = await setup();
  s.parent.remove();
  s.session.close();
  assert.equal(s.video.paused, true);
  assert.notEqual(s.video.parentNode, s.parent);
  assert.equal(s.restores(), 1);
});

test("live streams disable seeking and show a live indicator", async () => {
  const s = await setup({ live: true });
  assert.equal(s.control("Seek video").disabled, true);
  assert.ok(s.nodes().some(node => node.textContent.includes("LIVE")));
  s.session.close();
});

test("unsupported quality APIs leave playback controls usable", async () => {
  const s = await setup({ noQualities: true });
  await openQuality(s);
  assert.ok(s.nodes().some(node => node.textContent.includes("Quality control is unavailable")));
  await s.control("Pause").emit("click");
  assert.equal(s.video.paused, true);
  s.session.close();
});

test("keyboard seeking is clamped and range controls keep their native keys", async () => {
  const s = await setup();
  s.video.currentTime = 179;
  await s.pip.document.emit("keydown", { key: "ArrowRight" });
  assert.equal(s.video.currentTime, 180);
  await s.pip.document.emit("keydown", { key: "ArrowLeft", target: s.control("Volume") });
  assert.equal(s.video.currentTime, 180);
  s.session.close();
});

test("Trusted Types restrictions do not close the window when creating or updating controls", async () => {
  const s = await setup({ trustedTypes: true });
  assert.equal(s.session.isOpen, true);
  assert.equal(s.pip.closed, false);
  await s.control("Pause").emit("click");
  await s.control("Play").emit("click");
  await s.control("Mute").emit("click");
  await s.control("Unmute").emit("click");
  await openQuality(s);
  assert.equal(s.session.isOpen, true);
  const svg = s.nodes().filter(node => node.tagName === "SVG");
  assert.ok(svg.length >= 4);
  assert.ok(svg.every(node => node.namespaceURI === "http://www.w3.org/2000/svg"));
  s.session.close();
  assert.equal(s.video.parentNode, s.parent);
});

test("settings change speed and the sleep timer pauses video and cleans up on close", async () => {
  const s = await setup({ trustedTypes: true });
  await s.control("Player settings").emit("click");
  await menuItem(s, "Playback speed").emit("click");
  await menuItem(s, "1.5×").emit("click");
  assert.equal(s.video.playbackRate, 1.5);
  await menuItem(s, "‹ Playback speed").emit("click");
  await menuItem(s, "Sleep timer").emit("click");
  await menuItem(s, "15 minutes").emit("click");
  const timer = [...s.timers.values()].find(timer => timer.delay === 15 * 60000);
  assert.ok(timer);
  timer.callback();
  assert.equal(s.video.paused, true);
  s.session.close();
  assert.equal(s.timers.size, 0);
});

test("available subtitle cues display in PiP and original track mode is restored", async () => {
  const track = new Node("track");
  Object.assign(track, { kind: "subtitles", label: "English", mode: "disabled", activeCues: [{ text: "Hello" }] });
  const s = await setup({ tracks: [track] });
  await s.control("Toggle subtitles").emit("click");
  await s.control("Toggle subtitles").emit("click");
  assert.equal(track.mode, "hidden");
  assert.ok(s.nodes().some(node => node.className === "captions" && node.textContent === "Hello"));
  s.session.close();
  assert.equal(track.mode, "disabled");
});

test("controls follow the pointer immediately and playback events cannot reveal them", async () => {
  const s = await setup();
  const root = s.nodes().find(node => node.tagName === "MAIN");
  const isHidden = () => root.className.split(" ").includes("idle");
  assert.equal(isHidden(), true);
  await root.emit("pointerenter");
  assert.equal(isHidden(), false);
  assert.equal(s.timers.size, 0, "hover must not start an inactivity timer");
  await s.control("Player settings").emit("click");
  const menu = s.control("Player settings");
  assert.equal(menu.getAttribute("aria-expanded"), "true");
  await root.emit("pointerleave");
  assert.equal(isHidden(), true);
  assert.equal(menu.getAttribute("aria-expanded"), "false");
  s.video.pause();
  await s.video.emit("timeupdate");
  assert.equal(isHidden(), true);
  await root.emit("pointerenter");
  assert.equal(isHidden(), false);
  s.session.close();
});

test("leaving the document hides controls without a root pointerleave or app switch", async () => {
  const s = await setup();
  const root = s.nodes().find(node => node.tagName === "MAIN");
  await s.pip.document.emit("pointermove");
  assert.equal(root.className.includes("idle"), false);
  await s.pip.document.emit("mouseout", { relatedTarget: null });
  assert.equal(root.className.includes("idle"), true);
  await s.pip.document.emit("pointermove");
  await s.pip.document.emit("mouseout", { relatedTarget: s.control("Volume") });
  assert.equal(root.className.includes("idle"), false);
  await s.pip.emit("blur");
  assert.equal(root.className.includes("idle"), true);
  s.session.close();
});

test("YouTube captions are selectable without native video textTracks", async () => {
  const track = { languageCode: "en", displayName: "English (auto-generated)" };
  let selected = {};
  const captionPlayer = {
    loadModule() {},
    unloadModule() { selected = {}; },
    getOption(module, name) { return name === "tracklist" ? [track] : selected; },
    setOption(module, name, value) { selected = value; },
    querySelectorAll() { return [{ textContent: "YouTube caption line" }]; }
  };
  const s = await setup({ captionPlayer, trustedTypes: true });
  await s.control("Toggle subtitles").emit("click");
  await s.control("Toggle subtitles").emit("click");
  assert.equal(selected.languageCode, "en");
  assert.ok(s.nodes().some(node => node.className === "captions" && node.textContent === "YouTube caption line"));
  await s.control("Toggle subtitles").emit("click");
  assert.ok(s.nodes().some(node => node.className === "captions" && node.textContent === ""));
  s.session.close();
});

test("YouTube subtitles enable automatically and explicit Off persists across windows", async () => {
  let selected = {};
  const track = { languageCode: "en", displayName: "English" };
  const storage = new Map();
  const captionPlayer = {
    loadModule() {}, unloadModule() { selected = {}; },
    getOption(module, name) { return name === "tracklist" ? [track] : selected; },
    setOption(module, name, value) { selected = value; },
    querySelectorAll() { return [{ textContent: "Automatic captions" }]; }
  };
  const s = await setup({ captionPlayer, storage });
  assert.equal(selected.languageCode, "en");
  assert.ok(s.nodes().some(node => node.className === "captions" && node.textContent === "Automatic captions"));
  await s.control("Toggle subtitles").emit("click");
  s.session.close();
  const next = await setup({ captionPlayer, storage });
  assert.equal(selected.languageCode, undefined);
  assert.equal(JSON.parse(storage.get("floattube.captions.v1")).enabled, false);
  next.session.close();
});

test("CC toggles YouTube captions even when its track API reports no selection", async () => {
  let pressed = true;
  const storage = new Map([["floattube.captions.v1", JSON.stringify({ enabled: false })]]);
  const button = {
    getAttribute() { return String(pressed); },
    click() { pressed = !pressed; }
  };
  const captionPlayer = {
    querySelector() { return button; },
    querySelectorAll() { return pressed ? [{ textContent: "Visible caption" }] : []; },
    getOption(module, name) { return name === "tracklist" ? [] : {}; }
  };
  const s = await setup({ storage, captionPlayer, trustedTypes: true });
  const cc = s.control("Toggle subtitles");
  assert.equal(cc.getAttribute("aria-pressed"), "true");
  await s.control("Player settings").emit("click");
  assert.equal(menuItem(s, "Subtitles"), undefined);
  await cc.emit("click");
  assert.equal(pressed, false);
  assert.equal(cc.getAttribute("aria-pressed"), "false");
  assert.equal(menuItem(s, "Subtitles"), undefined);
  await cc.emit("click");
  assert.equal(pressed, true);
  assert.equal(cc.getAttribute("aria-pressed"), "true");
  s.session.close();
});

test("glass design can switch off and on in the existing mini-player window", async () => {
  const s = await setup();
  const root = s.nodes().find(node => node.tagName === "MAIN");
  s.session.setGlass(false);
  assert.equal(root.className.split(" ").includes("flat"), true);
  s.session.setGlass(true);
  assert.equal(root.className.split(" ").includes("flat"), false);
  s.session.close();
});

test("settings animate both entry into a section and return to the main menu", async () => {
  const s = await setup();
  assert.equal(s.control("Toggle subtitles").textContent, "ST");
  const menu = s.nodes().find(node => node.tagName === "SECTION");
  const animations = [];
  menu.animate = (frames, options) => {
    animations.push({ frames, options });
    return { finished: Promise.resolve(), cancel() {} };
  };
  await s.control("Player settings").emit("click");
  await menuItem(s, "Playback speed").emit("click");
  assert.equal(animations.length, 2);
  assert.ok(menuItem(s, "Normal"));
  await menuItem(s, "‹ Playback speed").emit("click");
  assert.equal(animations.length, 4);
  assert.ok(menuItem(s, "Quality"));
  s.session.close();
});

test("blur starts beyond the screen edge and increases with the hidden distance", async () => {
  const s = await setup({ position: { screenX: 10 } });
  const surface = s.video.parentNode;
  const tick = () => { for (const timer of s.intervals.values()) timer.callback(); };
  tick();
  assert.equal(surface.getAttribute("style"), null, "opening near an edge must not blur automatically");
  s.pip.screenX = 28;
  tick();
  assert.equal(surface.getAttribute("style"), null);
  s.pip.screenX = -60;
  tick();
  assert.equal(surface.getAttribute("style"), "--edge-blur:9px");
  s.pip.screenX = -120;
  tick();
  assert.equal(surface.getAttribute("style"), "--edge-blur:18px");
  s.pip.screenX = 300;
  tick();
  assert.equal(surface.getAttribute("style"), "--edge-blur:0px");
  s.pip.screenX = 1360;
  tick();
  assert.equal(surface.getAttribute("style"), "--edge-blur:0px");
  s.pip.screenX = 1480;
  tick();
  assert.equal(surface.getAttribute("style"), "--edge-blur:18px");
  s.session.close();
  assert.equal(s.intervals.size, 0);
});

test("edge blur uses the current monitor origin and tolerates unavailable coordinates", async () => {
  const s = await setup({ position: { screenX: -800, screen: { availLeft: -1920, availWidth: 1920 } } });
  const tick = () => { for (const timer of s.intervals.values()) timer.callback(); };
  s.pip.screenX = -2040;
  tick();
  assert.equal(s.video.parentNode.getAttribute("style"), "--edge-blur:18px");
  s.pip.screenX = -1200;
  tick();
  assert.equal(s.video.parentNode.getAttribute("style"), "--edge-blur:0px");
  s.pip.screenX = undefined;
  assert.doesNotThrow(tick);
  s.session.close();
});

test("corner arrow keeps the panel collapsed on hover and restores it on click", async () => {
  const s = await setup({ trustedTypes: true });
  const root = s.nodes().find(node => node.tagName === "MAIN");
  await root.emit("pointerenter");
  await s.control("Player settings").emit("click");
  assert.equal(menuItem(s, "Subtitles"), undefined);
  await s.control("Collapse controls").emit("click");
  assert.ok(root.className.split(" ").includes("panel-collapsed"));
  assert.equal(s.control("Player settings").getAttribute("aria-expanded"), "false");
  await root.emit("pointerleave");
  await root.emit("pointerenter");
  assert.ok(root.className.split(" ").includes("panel-collapsed"));
  await s.control("Show controls").emit("click");
  assert.equal(root.className.split(" ").includes("panel-collapsed"), false);
  assert.equal(s.control("Collapse controls").getAttribute("aria-expanded"), "true");
  assert.ok(s.control("Toggle subtitles"));
  s.session.close();
});

test("time is above the seek bar and mini-player labels switch between English and Russian", async () => {
  const s = await setup();
  const seek = s.control("Seek video");
  assert.equal(seek.parentNode.parentNode.children[0].className, "time");
  assert.equal(seek.parentNode.parentNode.children[1], seek.parentNode);
  await s.control("Player settings").emit("click");
  s.session.setLanguage("ru");
  assert.equal(s.pip.document.documentElement.lang, "ru");
  assert.ok(menuItem(s, "Скорость воспроизведения"));
  assert.ok(s.control("Настройки плеера"));
  assert.ok(s.control("Включить или выключить субтитры"));
  s.session.setLanguage("en");
  assert.ok(menuItem(s, "Playback speed"));
  assert.ok(s.control("Player settings"));
  s.session.close();
});

test("re-injection updates legacy branding in an already-open window", () => {
  const brand = { textContent: "FloatTube" };
  const activeDocument = { title: "FloatTube", querySelector: () => brand };
  const originalModule = {};
  const context = vm.createContext({ window: {
    __floatTubeWindow: originalModule,
    documentPictureInPicture: { window: { document: activeDocument } }
  } });
  vm.runInContext(source, context);
  assert.equal(brand.textContent, "SideView");
  assert.equal(activeDocument.title, "SideView");
  assert.equal(context.window.__floatTubeWindow, originalModule);
});

test("loaded parts of the video are rendered as separate buffered segments", async () => {
  const s = await setup();
  const ranges = [[0, 60], [120, 150]];
  s.video.buffered = {
    get length() { return ranges.length; },
    start(index) { return ranges[index][0]; },
    end(index) { return ranges[index][1]; }
  };
  await s.video.emit("progress");
  const buffered = s.nodes().find(node => node.className === "buffered");
  assert.equal(buffered.children.length, 2);
  assert.equal(buffered.children[0].getAttribute("style"), `left:0%;width:${60 / 180 * 100}%`);
  assert.equal(buffered.children[1].getAttribute("style"), `left:${120 / 180 * 100}%;width:${30 / 180 * 100}%`);
  ranges.length = 0;
  await s.video.emit("emptied");
  assert.equal(buffered.children.length, 0);
  s.session.close();
});

test("unavailable buffer information leaves an empty indicator without failing playback", async () => {
  const s = await setup();
  s.video.buffered = { length: 1, start() { throw new Error("stream replaced"); } };
  await s.video.emit("progress");
  assert.equal(s.nodes().find(node => node.className === "buffered").children.length, 0);
  assert.equal(s.video.paused, false);
  s.session.close();
});
