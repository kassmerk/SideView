(() => {
  "use strict";
  if (window.__floatTubeWindow) {
    const current = window.documentPictureInPicture?.window;
    const brand = current?.document.querySelector(".brand");
    if (brand) brand.textContent = "SideView";
    if (current) current.document.title = "SideView";
    return;
  }

  const icons = {
    collapse: [{ d: "m6 9 6 6 6-6", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" }],
    expand: [{ d: "m6 15 6-6 6 6", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" }],
    play: [{ d: "m9 5 11 7-11 7z" }],
    pause: [{ d: "M7 5h4v14H7zm7 0h4v14h-4z" }],
    volume: [{ d: "M3 9h4l5-4v14l-5-4H3z" }, { d: "M16 8q6 4 0 8m2-11q9 7 0 14", fill: "none", stroke: "currentColor", "stroke-width": "1.7" }],
    mute: [{ d: "M3 9h4l5-4v14l-5-4H3z" }, { d: "m16 9 5 6m0-6-5 6", fill: "none", stroke: "currentColor", "stroke-width": "1.7" }],
    settings: [{ d: "M8.94 4.61L10.06 4.24L10.09 2.18L13.91 2.18L13.94 4.24L15.06 4.61L16.12 5.14L17.59 3.71L20.29 6.41L18.86 7.88L19.39 8.94L19.76 10.06L21.82 10.09L21.82 13.91L19.76 13.94L19.39 15.06L18.86 16.12L20.29 17.59L17.59 20.29L16.12 18.86L15.06 19.39L13.94 19.76L13.91 21.82L10.09 21.82L10.06 19.76L8.94 19.39L7.88 18.86L6.41 20.29L3.71 17.59L5.14 16.12L4.61 15.06L4.24 13.94L2.18 13.91L2.18 10.09L4.24 10.06L4.61 8.94L5.14 7.88L3.71 6.41L6.41 3.71L7.88 5.14Z M15.25 12a3.25 3.25 0 1 0-6.5 0a3.25 3.25 0 1 0 6.5 0Z", "fill-rule": "evenodd", stroke: "currentColor", "stroke-width": ".35", "stroke-linejoin": "round" }],
    back: [{ d: "M4 5h16v14H4zM4 9h16", fill: "none", stroke: "currentColor", "stroke-width": "1.7" }, { d: "m14 11-4 3 4 3z" }],
    close: [{ d: "m6 6 12 12m0-12L6 18", fill: "none", stroke: "currentColor", "stroke-width": "1.8" }]
  };
  const qualityNames = { tiny: "144p", small: "240p", medium: "360p", large: "480p", hd720: "720p", hd1080: "1080p", hd1440: "1440p", hd2160: "2160p · 4K", hd2880: "2880p", highres: "Highest" };
  const css = `
    :root{color-scheme:dark;font:12px/1.4 "Segoe UI",sans-serif;background:#000;color:#fff}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
    .player{height:100%;position:relative;background:#000;isolation:isolate}
    .surface{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}
    .surface video{width:100%!important;height:100%!important;object-fit:contain!important;position:static!important;max-width:none!important;max-height:none!important;filter:blur(var(--edge-blur,0px));transition:filter .22s ease}
    button{border:0;color:inherit;cursor:pointer;background:transparent;font:inherit}
    button:disabled,input:disabled{opacity:.4;cursor:default}
    button:focus-visible{outline:2px solid #ff343b;outline-offset:2px}
    input:focus-visible{outline:none}
    input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px #ff343b55}
    .top,.controls{position:absolute;left:0;right:0;opacity:1;visibility:visible;transform:translateY(0);transition:opacity .2s ease,transform .2s ease,visibility 0s;z-index:1}
    .top{top:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px}
    .brand{font-size:10px;font-weight:600;letter-spacing:.3px;color:#eee;padding:6px 10px;border-radius:20px;background:#18201c55;backdrop-filter:blur(14px);border:1px solid #ffffff18}
    .controls{left:12px;right:12px;bottom:12px;padding:9px 11px 7px;border-radius:16px;background:linear-gradient(140deg,#ffffff20,#16231c75 65%,#111b1870);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);border:1px solid #ffffff30;box-shadow:inset 0 1px 0 #ffffff18,0 8px 28px #0004}
    .player.idle .top,.player.idle .controls,.player.idle .menu,.player.idle .feedback{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s}
    .player.idle .top{transform:translateY(-4px)}
    .player.idle .controls,.player.idle .menu{transform:translateY(5px)}
    .row{display:flex;align-items:center;gap:7px;min-height:34px;padding-left:36px}.spacer{flex:1}
    .icon{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;padding:5px;flex-shrink:0;background:#ffffff0c;border:1px solid #ffffff18;box-shadow:inset 0 1px 0 #ffffff08;transition:background .18s ease,transform .18s ease,border-color .18s ease}
    .icon:hover{background:#ffffff25;border-color:#ffffff40;transform:translateY(-1px)}.icon:active{background:#ffffff35;transform:scale(.94)}
    svg{width:18px;height:18px;fill:currentColor;pointer-events:none}
    .playback{width:28px;height:28px}.playback svg{width:15px;height:15px}
    input[type=range]{appearance:none;-webkit-appearance:none;background:transparent;border:0;box-shadow:none;cursor:pointer;margin:0;height:16px}
    input[type=range]::-webkit-slider-runnable-track{height:3px;border:0;border-radius:3px;background:linear-gradient(to right,var(--slider-color,#ff343b) var(--progress,0%),#ffffff30 var(--progress,0%))}
    input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:10px;height:10px;border:0;border-radius:50%;background:var(--slider-color,#ff343b);margin-top:-3.5px}
    input[type=range]::-moz-range-track{height:3px;border:0;border-radius:3px;background:#ffffff30}
    input[type=range]::-moz-range-progress{height:3px;background:var(--slider-color,#ff343b)}
    input[type=range]::-moz-range-thumb{width:10px;height:10px;border:0;border-radius:50%;background:var(--slider-color,#ff343b)}
    .seek{display:block;width:100%;height:18px!important}.volume{width:64px;--slider-color:#fff}
    .seek-area{position:relative;height:18px}
    .buffered{position:absolute;left:0;right:0;top:50%;height:3px;transform:translateY(-50%);border-radius:3px;background:#ffffff24;overflow:hidden;pointer-events:none}
    .buffered span{position:absolute;top:0;height:100%;background:#b5b5b5b3}
    .seek-area .seek{position:relative;z-index:1}
    .seek::-webkit-slider-runnable-track{background:linear-gradient(to right,#ff343b var(--progress,0%),transparent var(--progress,0%))!important}
    .seek::-moz-range-track{background:transparent!important}
    .volume:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px #ffffff40}
    .time{display:block;margin:0 0 1px 2px;font-size:11px;white-space:nowrap;font-variant-numeric:tabular-nums;text-shadow:0 1px 3px #0005}
    .menu{position:absolute;bottom:90px;right:12px;width:260px;max-width:calc(100% - 24px);max-height:calc(100% - 130px);overflow:auto;scrollbar-width:none;overscroll-behavior:contain;background:linear-gradient(135deg,#424c4580,#131c18bd);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3);border:1px solid #ffffff30;border-radius:15px;box-shadow:inset 0 1px 0 #ffffff12,0 12px 35px #0005;padding:7px;z-index:2}
    .menu::-webkit-scrollbar{display:none;width:0;height:0}
    .menu{opacity:1;visibility:visible;transform:translateY(0);transition:opacity .2s ease,transform .2s ease,visibility 0s}
    .menu[hidden]{display:block;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(5px);transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s}.menu-title{margin:4px 8px 7px;color:#bbb;font-size:11px}
    .quality{display:flex;align-items:center;width:100%;padding:9px 10px;border-radius:8px;text-align:left;gap:8px;transition:background .18s ease}
    .quality:hover{background:#ffffff18}.quality[aria-checked=true]{background:#ffffff12}.check{width:12px;flex-shrink:0}
    .setting-value{margin-left:auto;color:#d0d7d2;font-size:11px}.menu-heading{font-weight:600}.captions{position:absolute;bottom:92px;left:12px;right:12px;text-align:center;pointer-events:none;white-space:pre-line;font-size:16px;text-shadow:0 1px 4px #000;z-index:1;transition:bottom .2s ease}
    .player.idle .captions{bottom:14px}
    .notice{padding:7px 10px;font-size:11px;color:#bbb;overflow-wrap:anywhere}
    .feedback{position:absolute;left:12px;right:12px;top:43px;color:#eee;background:#202020dc;border-radius:6px;padding:8px;font-size:11px;pointer-events:none;z-index:3;transition:opacity .2s ease,visibility 0s}
    .feedback:empty{display:none}
    .panel-toggle{position:absolute;left:24px;bottom:23px;z-index:3;width:28px;height:28px;transition:bottom .22s ease,left .22s ease,opacity .2s ease,transform .2s ease,visibility 0s}
    .panel-toggle svg{width:16px;height:16px}
    .player.panel-collapsed .controls{opacity:0;visibility:hidden;pointer-events:none;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s}
    .player.panel-collapsed .panel-toggle{left:12px;bottom:12px;background:#26312bb3;backdrop-filter:blur(12px)}
    .player.panel-collapsed .captions{bottom:14px}
    .player.idle:not(.panel-collapsed) .panel-toggle{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease,visibility 0s linear .2s}
    .player.flat .panel-toggle{background:#202020;backdrop-filter:none}
    .player.flat .controls{background:#181818f5;backdrop-filter:none;-webkit-backdrop-filter:none;border-color:#ffffff18;box-shadow:0 4px 16px #0005}
    .player.flat .menu{background:#202020;backdrop-filter:none;-webkit-backdrop-filter:none;border-color:#ffffff18;box-shadow:0 8px 24px #0006}
    .player.flat .brand{background:#202020;backdrop-filter:none}
    .cc{font-size:10px;font-weight:700;letter-spacing:-.5px}.cc[aria-pressed=true]{border-bottom:2px solid #ff4549;color:#fff;background:#ffffff20}
    @media(max-width:360px){.row{gap:3px}.volume{width:45px}.controls{padding-left:8px;padding-right:8px}.time{font-size:10px}}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
  `;

  function time(value) {
    if (!Number.isFinite(value)) return "0:00";
    value = Math.max(0, Math.floor(value));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor(value / 60) % 60;
    const seconds = String(value % 60).padStart(2, "0");
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
  }

  async function open({ video, getQualities, selectQuality, captionPlayer, glassDesign = true, language = "en", onClose }) {
    // requestWindow must be the first asynchronous operation to preserve activation.
    const pip = await window.documentPictureInPicture.requestWindow({ width: 560, height: 340 });
    const doc = pip.document;
    const originalParent = video.parentNode;
    const originalStyle = video.getAttribute("style");
    const originalControls = video.controls;
    const marker = document.createComment("SideView video return position");
    let restored = false;
    let feedbackTimer;
    let sleepTimer;
    let captionAutoTimer;
    const captionPreferenceKey = "floattube.captions.v1";
    let captionPreference = { enabled: true, language: "" };
    try {
      const saved = JSON.parse(localStorage.getItem(captionPreferenceKey) || "null");
      if (typeof saved?.enabled === "boolean") captionPreference = saved;
    } catch { /* Default to captions on when site storage is unavailable. */ }
    let youtubeCaption = null;
    let sleepMinutes = 0;
    const originalTrackModes = Array.from(video.textTracks || [], track => [track, track.mode]);
    let captionTrack = originalTrackModes.find(([track, mode]) => mode === "showing" && ["subtitles", "captions"].includes(track.kind))?.[0] || null;
    const wasPlaying = !video.paused;
    const cleanup = [];

    function listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      cleanup.push(() => target.removeEventListener(type, handler, options));
    }
    function restore() {
      if (restored) return;
      restored = true;
      clearTimeout(feedbackTimer);
      clearTimeout(sleepTimer);
      clearTimeout(captionAutoTimer);
      for (const [track, mode] of originalTrackModes) track.mode = mode;
      for (const remove of cleanup) remove();
      const resume = !video.paused;
      let returned = false;
      if (marker.parentNode?.isConnected) { marker.replaceWith(video); returned = true; }
      else if (originalParent?.isConnected) { originalParent.append(video); returned = true; }
      else {
        // The watch page may have been replaced while PiP was open. Do not
        // attach an old stream to a different video's newly created player.
        video.pause();
        marker.remove();
      }
      if (originalStyle === null) video.removeAttribute("style");
      else video.setAttribute("style", originalStyle);
      video.controls = originalControls;
      if (returned && resume && video.paused) void video.play().catch(() => {});
      onClose?.();
    }

    try {
      if (!originalParent) throw new Error("The video is no longer on this page.");
      originalParent.insertBefore(marker, video);
      doc.documentElement.lang = "en";
      const i18n = globalThis.FloatTubeI18n;
      function setLanguage(value) {
        language = value === "ru" ? "ru" : "en";
        doc.documentElement.lang = language;
        i18n?.localize(doc.body, language);
      }
      doc.title = "SideView";
      const style = doc.createElement("style");
      style.textContent = css;
      doc.head.append(style);
      function element(tag, className, text) {
        const node = doc.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        i18n?.localize(node, language);
        return node;
      }
      function iconButton(name, label, callback) {
        const button = element("button", "icon");
        button.type = "button";
        button.title = label;
        button.setAttribute("aria-label", label);
        renderIcon(button, name);
        listen(button, "click", callback);
        i18n?.localize(button, language);
        return button;
      }
      function renderIcon(button, name) {
        // Document PiP inherits the site's policy. DOM construction works
        // under Trusted Types without HTML sinks or a permissive policy.
        const namespace = "http://www.w3.org/2000/svg";
        const svg = doc.createElementNS(namespace, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        for (const attributes of icons[name]) {
          const path = doc.createElementNS(namespace, "path");
          for (const [key, value] of Object.entries(attributes)) path.setAttribute(key, value);
          svg.append(path);
        }
        button.replaceChildren(svg);
      }
      function range(className, label, min, max, step) {
        const input = element("input", className);
        input.type = "range";
        input.min = min;
        input.max = max;
        input.step = step;
        input.setAttribute("aria-label", label);
        return input;
      }
      const root = element("main", "player");
      root.classList.toggle("flat", !glassDesign);
      const surface = element("div", "surface");
      let previousX = pip.screenX;
      let previousY = pip.screenY;
      let hasMoved = false;
      let previousBlur = 0;
      function updateEdgeBlur() {
        const x = pip.screenX;
        const y = pip.screenY;
        const width = pip.outerWidth;
        const available = pip.screen?.availWidth;
        if (![x, y, width, available].every(Number.isFinite) || available <= 0 || width <= 0) return;
        if (x !== previousX || y !== previousY) hasMoved = true;
        previousX = x;
        previousY = y;
        if (!hasMoved) return;
        const left = Number.isFinite(pip.screen.availLeft) ? pip.screen.availLeft : 0;
        const distance = Math.min(x - left, left + available - x - width);
        const proximity = Math.max(0, Math.min(1, -distance / Math.min(120, width * .3)));
        const blur = Math.round(proximity * 18 * 10) / 10;
        if (blur === previousBlur) return;
        previousBlur = blur;
        surface.setAttribute("style", `--edge-blur:${blur}px`);
      }
      const edgeTimer = setInterval(updateEdgeBlur, 100);
      cleanup.push(() => clearInterval(edgeTimer));
      const top = element("div", "top");
      const feedback = element("div", "feedback");
      const captions = element("div", "captions");
      feedback.setAttribute("role", "status");
      top.append(element("span", "brand", "SideView"), iconButton("close", "Close mini player", () => pip.close()));
      const controls = element("div", "controls");
      const seek = range("seek", "Seek video", 0, 100, .1);
      const seekArea = element("div", "seek-area");
      const buffered = element("div", "buffered");
      buffered.setAttribute("aria-hidden", "true");
      seekArea.append(buffered, seek);
      let bufferedSignature = "";
      function syncBuffered() {
        const duration = video.duration;
        const ranges = [];
        try {
          if (Number.isFinite(duration) && duration > 0) {
            for (let index = 0; index < (video.buffered?.length || 0); index++) {
              const start = Math.max(0, Math.min(duration, video.buffered.start(index)));
              const end = Math.max(start, Math.min(duration, video.buffered.end(index)));
              if (end > start) ranges.push([start / duration * 100, (end - start) / duration * 100]);
            }
          }
        } catch { ranges.length = 0; }
        const signature = JSON.stringify(ranges);
        if (signature === bufferedSignature) return;
        bufferedSignature = signature;
        buffered.replaceChildren();
        for (const [start, width] of ranges) {
          const segment = element("span");
          segment.setAttribute("style", `left:${start}%;width:${width}%`);
          buffered.append(segment);
        }
      }
      const row = element("div", "row");
      function message(text) {
        feedback.textContent = text;
        clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => { feedback.textContent = ""; }, 4000);
      }
      async function togglePlayback() {
        try {
          if (video.paused) await video.play();
          else video.pause();
        } catch { message("Unable to play. Return to the YouTube tab and try again."); }
      }
      const play = iconButton("play", "Play", togglePlayback);
      play.className += " playback";
      const mute = iconButton("volume", "Mute", () => {
        if (video.volume === 0) { video.volume = .5; video.muted = false; }
        else video.muted = !video.muted;
        sync();
      });
      const volume = range("volume", "Volume", 0, 1, .01);
      const clock = element("span", "time");
      const cc = element("button", "icon cc", "ST");
      cc.type = "button";
      cc.title = "Subtitles · On / Off";
      cc.setAttribute("aria-label", "Toggle subtitles");
      listen(cc, "click", () => setCaptionsEnabled(!captionState().enabled));
      const menu = element("section", "menu");
      let pageAnimation = null;
      let navigationId = 0;
      function cancelMenuTransition() {
        navigationId++;
        pageAnimation?.cancel();
        pageAnimation = null;
      }
      function navigate(render, back = false) {
        cancelMenuTransition();
        const current = navigationId;
        if (typeof menu.animate !== "function" || pip.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
          render();
          return;
        }
        const offset = back ? 7 : -7;
        pageAnimation = menu.animate([
          { opacity: 1, transform: "translateX(0)" },
          { opacity: 0, transform: `translateX(${offset}px)` }
        ], { duration: 90, easing: "ease-in" });
        return pageAnimation.finished.then(async () => {
          if (current !== navigationId || restored || menu.hidden) return;
          render();
          pageAnimation = menu.animate([
            { opacity: 0, transform: `translateX(${-offset}px)` },
            { opacity: 1, transform: "translateX(0)" }
          ], { duration: 170, easing: "cubic-bezier(.2,.8,.2,1)" });
          await pageAnimation.finished;
          if (current === navigationId) pageAnimation = null;
        }).catch(() => { /* A newer navigation or closing the menu cancels the transition. */ });
      }
      cleanup.push(cancelMenuTransition);
      menu.hidden = true;
      menu.setAttribute("aria-label", "Player settings");
      const settings = iconButton("settings", "Player settings", () => {
        cancelMenuTransition();
        menu.hidden = !menu.hidden;
        root.classList.toggle("menu-open", !menu.hidden);
        settings.setAttribute("aria-expanded", String(!menu.hidden));
        if (!menu.hidden) renderSettings();
      });
      settings.setAttribute("aria-expanded", "false");
      function menuAction(label, value, action) {
        const button = element("button", "quality");
        button.type = "button";
        button.append(element("span", "", label), element("span", "setting-value", value));
        button.addEventListener("click", action);
        menu.append(button);
        return button;
      }
      function menuHeader(title) {
        menu.replaceChildren();
        const back = menuAction(`‹ ${title}`, "", () => navigate(renderSettings, true));
        back.className += " menu-heading";
      }
      function renderSettings() {
        menu.replaceChildren(element("div", "menu-title", "Settings"));
        menuAction("Playback speed", `${video.playbackRate || 1}× ›`, () => navigate(renderSpeed));
        menuAction("Sleep timer", sleepMinutes ? `${sleepMinutes} min ›` : "Off ›", () => navigate(renderSleep));
        let selected;
        try { selected = getQualities()?.selected; } catch { /* Player not ready. */ }
        menuAction("Quality", `${qualityNames[selected] || "Auto"} ›`, () => navigate(renderQualities));
      }
      function renderSpeed() {
        menuHeader("Playback speed");
        for (const rate of [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2]) {
          menuAction(rate === 1 ? "Normal" : `${rate}×`, video.playbackRate === rate ? "✓" : "", () => {
            video.playbackRate = rate;
            renderSpeed();
          });
        }
      }
      function renderSleep() {
        menuHeader("Sleep timer");
        for (const minutes of [0, 15, 30, 45, 60]) {
          menuAction(minutes ? `${minutes} minutes` : "Off", sleepMinutes === minutes ? "✓" : "", () => {
            clearTimeout(sleepTimer);
            sleepMinutes = minutes;
            if (minutes) sleepTimer = setTimeout(() => {
              sleepMinutes = 0;
              video.pause();
              sync();
              message("Sleep timer finished. Video paused.");
            }, minutes * 60000);
            renderSleep();
          });
        }
      }
      function syncCaptions() {
        cc.setAttribute("aria-pressed", String(captionState().enabled));
        if (captionTrack && ["hidden", "showing"].includes(captionTrack.mode)) {
          captions.textContent = Array.from(captionTrack.activeCues || [], cue => cue.text || "").join("\n");
          return;
        }
        captionTrack = null;
        try {
          const selected = captionPlayer?.getOption?.("captions", "track");
          const enabled = captionState().enabled;
          captions.textContent = enabled
            ? Array.from(captionPlayer.querySelectorAll(".ytp-caption-segment"), node => node.textContent || "").join("\n")
            : "";
        } catch { captions.textContent = ""; }
      }
      function captionState() {
        const native = Array.from(video.textTracks || []).find(track => ["subtitles", "captions"].includes(track.kind) && ["showing", "hidden"].includes(track.mode));
        if (native) return { enabled: true, label: native.label || native.language || "On" };
        let selected;
        try { selected = captionPlayer?.getOption?.("captions", "track"); } catch { /* Use the current session selection. */ }
        const track = selected?.languageCode ? selected : youtubeCaption;
        const actual = youtubeEnabled();
        const enabled = actual === null ? Boolean(track) : actual;
        return { enabled, label: enabled ? track?.displayName || track?.languageName || track?.languageCode || "On" : "Off", language: enabled ? track?.languageCode : undefined };
      }
      function youtubeEnabled() {
        try {
          const value = captionPlayer?.querySelector?.(".ytp-subtitles-button")?.getAttribute("aria-pressed");
          if (value === "true" || value === "false") return value === "true";
          const enabled = captionPlayer?.isSubtitlesOn?.();
          if (typeof enabled === "boolean") return enabled;
        } catch { /* Fall back to the selected track when the UI is unavailable. */ }
        return null;
      }
      function setYoutubeEnabled(enabled) {
        const actual = youtubeEnabled();
        if (actual === enabled) return;
        const button = captionPlayer?.querySelector?.(".ytp-subtitles-button");
        if (button && actual !== null) button.click();
        else if (typeof captionPlayer?.toggleSubtitles === "function" && actual !== null) captionPlayer.toggleSubtitles();
        else if (!enabled) {
          captionPlayer?.setOption?.("captions", "track", {});
          captionPlayer?.unloadModule?.("captions");
        }
      }
      function setCaptionsEnabled(enabled) {
        saveCaptionPreference(enabled, captionState().language || captionPreference.language || "");
        try {
          if (enabled) {
            setYoutubeEnabled(true);
            autoEnableCaptions();
          } else {
            for (const track of Array.from(video.textTracks || [])) {
              if (["subtitles", "captions"].includes(track.kind)) track.mode = "disabled";
            }
            captionTrack = null;
            youtubeCaption = null;
            setYoutubeEnabled(false);
          }
          syncCaptions();
          if (!menu.hidden) renderSettings();
        } catch { message("Unable to change subtitles for this video. Please try again."); }
      }
      function youtubeTracks() {
        try {
          const live = captionPlayer?.getOption?.("captions", "tracklist");
          const tracks = Array.isArray(live) ? live : live?.captionTracks;
          return tracks || captionPlayer?.getPlayerResponse?.()?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        } catch { return []; }
      }
      function saveCaptionPreference(enabled, language = "") {
        clearTimeout(captionAutoTimer);
        captionPreference = { enabled, language };
        try { localStorage.setItem(captionPreferenceKey, JSON.stringify(captionPreference)); } catch { /* Selection still works for this window. */ }
      }
      function autoEnableCaptions(attempt = 0) {
        if (restored || !captionPreference.enabled) return;
        const tracks = Array.from(video.textTracks || []).filter(track => ["subtitles", "captions"].includes(track.kind));
        if (tracks.length) {
          captionTrack = tracks.find(track => track.language === captionPreference.language) || captionTrack || tracks[0];
          for (const track of tracks) track.mode = track === captionTrack ? "hidden" : "disabled";
          syncCaptions();
          return;
        }
        try {
          captionPlayer?.loadModule?.("captions");
          setYoutubeEnabled(true);
          const tracks = youtubeTracks();
          const current = captionPlayer?.getOption?.("captions", "track");
          const selected = tracks.find(track => track.languageCode === captionPreference.language)
            || tracks.find(track => track.languageCode === current?.languageCode) || tracks[0];
          if (selected && typeof captionPlayer?.setOption === "function") {
            captionPlayer.setOption("captions", "track", selected);
            youtubeCaption = selected;
            syncCaptions();
            return;
          }
        } catch { /* The YouTube captions module may still be loading. */ }
        if (captionPlayer && attempt < 8) captionAutoTimer = setTimeout(() => autoEnableCaptions(attempt + 1), 500);
      }
      function renderQualities() {
        menuHeader("Quality");
        let data;
        try { data = getQualities(); } catch { data = null; }
        if (!data?.levels?.length) {
          menu.append(element("div", "notice", "Quality control is unavailable for this video. Use YouTube settings."));
          return;
        }
        const list = element("div");
        list.setAttribute("role", "menu");
        for (const level of [...data.levels.filter(level => level !== "auto"), "auto"]) {
          const choice = element("button", "quality");
          choice.type = "button";
          choice.setAttribute("role", "menuitemradio");
          choice.setAttribute("aria-checked", String(data.selected === level));
          choice.append(element("span", "check", data.selected === level ? "✓" : ""), element("span", "", level === "auto" ? "Auto" : qualityNames[level] || level));
          // These nodes are discarded whenever the menu is rebuilt.
          choice.addEventListener("click", () => {
            try {
              const warning = selectQuality(level);
              if (warning) message(warning);
            } catch { message("YouTube could not apply this quality. Try selecting it on YouTube."); }
            renderQualities();
            sync();
          });
          list.append(choice);
        }
        menu.append(list);
      }
      row.append(play, mute, volume, element("span", "spacer"), cc, settings,
        iconButton("back", "Return video to tab", () => { pip.close(); window.focus(); }));
      controls.append(clock, seekArea, row);
      let panelCollapsed = false;
      const panelToggle = iconButton("collapse", "Collapse controls", () => {
        panelCollapsed = !panelCollapsed;
        root.classList.toggle("panel-collapsed", panelCollapsed);
        cancelMenuTransition();
        menu.hidden = true;
        root.classList.remove("menu-open");
        settings.setAttribute("aria-expanded", "false");
        const label = panelCollapsed ? "Show controls" : "Collapse controls";
        panelToggle.setAttribute("aria-label", label);
        panelToggle.title = label;
        panelToggle.setAttribute("aria-expanded", String(!panelCollapsed));
        renderIcon(panelToggle, panelCollapsed ? "expand" : "collapse");
        reveal();
      });
      panelToggle.className += " panel-toggle";
      panelToggle.setAttribute("aria-expanded", "true");
      root.append(surface, top, captions, feedback, controls, menu, panelToggle);
      doc.body.replaceChildren(root);
      const languageObserver = i18n?.watch(doc.body, () => language);
      if (languageObserver) cleanup.push(() => languageObserver.disconnect());
      // Move the original media element, preserving its stream, time and volume.
      // No capture, re-encoding or second video element is involved.
      video.controls = false;
      if (captionTrack) captionTrack.mode = "hidden";
      video.setAttribute("style", "width:100%;height:100%;position:static;object-fit:contain");
      surface.append(video);
      if (wasPlaying && video.paused) void video.play().catch(() => message("Press Play to resume the video."));

      function reveal() {
        root.classList.remove("idle");
      }
      function hide() {
        cancelMenuTransition();
        root.classList.add("idle");
        root.classList.remove("menu-open");
        menu.hidden = true;
        settings.setAttribute("aria-expanded", "false");
      }
      function sync() {
        const playing = !video.paused;
        renderIcon(play, playing ? "pause" : "play");
        play.setAttribute("aria-label", playing ? "Pause" : "Play");
        play.title = playing ? "Pause" : "Play";
        const muted = video.muted || video.volume === 0;
        renderIcon(mute, muted ? "mute" : "volume");
        mute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
        mute.title = muted ? "Unmute" : "Mute";
        volume.value = muted ? 0 : video.volume;
        volume.setAttribute("style", `--progress:${Number(volume.value) * 100}%`);
        const duration = video.duration;
        seek.disabled = !Number.isFinite(duration) || duration <= 0;
        if (!seek.disabled) {
          seek.max = duration;
          seek.value = Math.min(duration, video.currentTime || 0);
          seek.setAttribute("style", `--progress:${Number(seek.value) / duration * 100}%`);
          seek.setAttribute("aria-valuetext", `${time(video.currentTime)} of ${time(duration)}`);
        }
        clock.textContent = `${time(video.currentTime)} / ${Number.isFinite(duration) ? time(duration) : "LIVE"}`;
        syncBuffered();
        syncCaptions();
      }
      listen(volume, "input", () => { video.volume = Number(volume.value); video.muted = false; sync(); });
      listen(seek, "input", () => { if (!seek.disabled) video.currentTime = Math.min(video.duration, Math.max(0, Number(seek.value))); sync(); });
      listen(video, "click", togglePlayback);
      for (const event of ["play", "pause", "timeupdate", "durationchange", "volumechange", "loadedmetadata", "ended"]) listen(video, event, sync);
      listen(video, "progress", syncBuffered);
      listen(video, "emptied", syncBuffered);
      for (const track of Array.from(video.textTracks || [])) listen(track, "cuechange", syncCaptions);
      listen(root, "pointermove", reveal);
      listen(root, "pointerenter", reveal);
      listen(root, "pointerleave", hide);
      listen(root, "mouseleave", hide);
      for (const event of ["pointerout", "mouseout"]) {
        listen(doc, event, event => { if (!event.relatedTarget) hide(); });
      }
      listen(doc, "mouseleave", hide);
      listen(doc, "pointerleave", hide);
      listen(doc, "pointermove", reveal);
      listen(pip, "blur", hide);
      listen(root, "focusin", reveal);
      listen(doc, "keydown", event => {
        if (event.key === "Escape") {
          cancelMenuTransition();
          menu.hidden = true;
          root.classList.remove("menu-open");
          settings.setAttribute("aria-expanded", "false");
          return;
        }
        if (["INPUT", "SELECT", "BUTTON"].includes(event.target?.tagName)) return;
        if ([" ", "k", "K"].includes(event.key)) { event.preventDefault(); void togglePlayback(); }
        else if (["m", "M"].includes(event.key)) { video.muted = !video.muted; sync(); }
        else if (["ArrowLeft", "ArrowRight"].includes(event.key) && Number.isFinite(video.duration)) {
          event.preventDefault();
          video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + (event.key === "ArrowLeft" ? -10 : 10)));
        }
        reveal();
      });
      listen(pip, "pagehide", restore, { once: true });
      if (captionPlayer && typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(syncCaptions);
        observer.observe(captionPlayer, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed"] });
        cleanup.push(() => observer.disconnect());
      }
      sync();
      autoEnableCaptions();
      hide();
      setLanguage(language);
      return { video, window: pip, setLanguage, setGlass(enabled) { root.classList.toggle("flat", !enabled); }, close() { pip.close(); restore(); }, get isOpen() { return !restored && !pip.closed; } };
    } catch (error) {
      restore();
      pip.close();
      throw error;
    }
  }
  window.__floatTubeWindow = Object.freeze({ open });
})();
