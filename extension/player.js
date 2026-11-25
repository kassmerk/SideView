(() => {
  "use strict";
  if (window.__floatTube) return;

  const preferenceKey = "floattube.preferences.v1";
  const defaults = { automatic: true, returnOnFocus: true, keepQuality: true, playerControls: true, glassDesign: true, language: "en" };
  let preferences = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || "{}");
    for (const key of Object.keys(defaults)) {
      if (typeof defaults[key] === "boolean" && typeof saved[key] === "boolean") preferences[key] = saved[key];
    }
    if (["en", "ru"].includes(saved.language)) preferences.language = saved.language;
  } catch { /* Continue with defaults if site storage is unavailable. */ }

  let autoSupported = false;
  let opening = false;
  let automaticVideo = null;
  let dismissedUntilVisible = false;
  let status = "";
  let activeVideo = null;
  let closing = null;
  let returnTimer = null;
  const disabledOverrides = new Map();
  const qualityHeights = { tiny: 144, small: 240, medium: 360, large: 480, hd720: 720, hd1080: 1080, hd1440: 1440, hd2160: 2160, hd2880: 2880, highres: 4320 };
  let visibleQuality = null;
  let qualitySession = null;
  let qualityTimer = null;
  let qualityWarning = "";
  let documentSession = null;
  let documentContext = null;

  function pipVideo() {
    return documentSession?.isOpen ? documentSession.video : document.pictureInPictureElement;
  }

  function getQualityOptions(video) {
    try {
      const player = qualityPlayer(video);
      if (typeof player?.setPlaybackQualityRange !== "function") return { levels: [] };
      const levels = player.getAvailableQualityLevels().filter(level => Object.hasOwn(qualityHeights, level));
      return { levels, selected: qualitySession?.level || player.getPlaybackQuality?.() || "auto" };
    } catch { return { levels: [] }; }
  }

  function selectQuality(video, level) {
    const player = qualityPlayer(video);
    const snapshot = readQuality(video);
    const levels = getQualityOptions(video).levels;
    if (!snapshot || (level !== "auto" && !levels.includes(level))) throw new Error("This quality is unavailable.");
    stopQuality();
    player.setPlaybackQualityRange(level, level);
    preferences.keepQuality = level !== "auto";
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch { /* Keep the selection for this tab. */ }
    if (preferences.keepQuality) startQuality(video, { ...snapshot, level });
    return qualityWarning;
  }

  function qualityPlayer(video) {
    if (documentContext?.video === video) return documentContext.player;
    const player = video?.closest?.("#movie_player") || document.querySelector("#movie_player");
    if (!player || (player.contains && !player.contains(video))) return null;
    return player;
  }

  function readQuality(video) {
    try {
      const player = qualityPlayer(video);
      if (typeof player?.getAvailableQualityLevels !== "function"
          || typeof player?.setPlaybackQualityRange !== "function"
          || player.classList?.contains("ad-showing")) return null;
      const levels = player.getAvailableQualityLevels();
      if (!Array.isArray(levels)) return null;
      let level = player.getPlaybackQuality?.();
      if (!Object.hasOwn(qualityHeights, level)) {
        const height = Math.min(video.videoWidth, video.videoHeight);
        level = Object.keys(qualityHeights).find(key => qualityHeights[key] === height && levels.includes(key));
      }
      if (!level || !levels.includes(level)) return null;
      return { video, player, level, videoId: player.getVideoData?.()?.video_id || video.currentSrc || "" };
    } catch { return null; }
  }

  function rememberQuality() {
    if (document.hidden || pipVideo() || opening) return;
    const video = findVideo();
    if (video) visibleQuality = readQuality(video);
  }

  function stopQuality() {
    if (qualityTimer !== null) clearInterval(qualityTimer);
    qualityTimer = null;
    qualitySession = null;
    qualityWarning = "";
  }

  function enforceQuality() {
    const saved = qualitySession;
    if (!saved) return;
    if (!preferences.keepQuality || pipVideo() !== saved.video) {
      stopQuality();
      return;
    }
    try {
      const player = qualityPlayer(saved.video);
      const videoId = player?.getVideoData?.()?.video_id || saved.video.currentSrc || "";
      if (player !== saved.player || videoId !== saved.videoId) {
        stopQuality(); // Never carry a resolution over to another video.
        return;
      }
      if (player.classList?.contains("ad-showing")) return;
      if (!player.getAvailableQualityLevels().includes(saved.level)) {
        qualityWarning = "The saved quality is no longer available for this video.";
        return;
      }
      // Do not use the deprecated setPlaybackQuality API: on embeds it is a no-op.
      // This is a best-effort request to the native YouTube page player.
      const current = player.getPlaybackQuality?.();
      if (!saved.applied || current !== saved.level) {
        player.setPlaybackQualityRange(saved.level, saved.level);
        saved.applied = true;
      }
      const after = player.getPlaybackQuality?.();
      qualityWarning = after && after !== saved.level
        ? "YouTube has not applied the saved quality yet. Check the stream and your connection."
        : "";
    } catch {
      stopQuality();
      qualityWarning = "Quality control is unavailable. Choose a fixed quality in YouTube settings.";
    }
  }

  function startQuality(video, snapshot) {
    stopQuality();
    if (!preferences.keepQuality) return;
    const current = readQuality(video);
    qualitySession = snapshot && current && snapshot.video === video
      && snapshot.player === current.player && snapshot.videoId === current.videoId ? snapshot : current;
    if (!qualitySession) {
      qualityWarning = "Quality control is unavailable. Choose a fixed quality in YouTube settings.";
      return;
    }
    qualitySession = { ...qualitySession, applied: false };
    enforceQuality();
    if (qualitySession) qualityTimer = setInterval(enforceQuality, 1500);
  }

  function restoreVideo(video) {
    if (!video || pipVideo() === video || !disabledOverrides.has(video)) return;
    const original = disabledOverrides.get(video);
    disabledOverrides.delete(video);
    video.disablePictureInPicture = original;
  }

  function scheduleReturn() {
    if (returnTimer !== null) clearTimeout(returnTimer);
    // Let the browser complete its own Auto PiP exit first. Never hold the
    // opening lock while waiting for the native window to close.
    returnTimer = setTimeout(() => {
      returnTimer = null;
      if (!document.hidden && preferences.returnOnFocus && automaticVideo
          && pipVideo() === automaticVideo) {
        void close().catch(() => {});
      }
    }, 100);
  }

  function findVideo() {
    // The active PiP element can briefly have no dimensions during a tab switch.
    if (pipVideo()) return pipVideo();
    const videos = [...document.querySelectorAll("video")]
      .filter(video => video.readyState >= 1 && video.videoWidth > 0);
    // Prefer the main player over hover previews and other secondary videos.
    return videos.find(video => video.matches("#movie_player video, #player video") && !video.paused)
      || videos.find(video => !video.paused)
      || videos.find(video => video.matches("#movie_player video, #player video"))
      || videos[0];
  }

  function errorText(error) {
    if (error?.name === "NotAllowedError") {
      return "Your browser blocked PiP. Try clicking the button again or allow automatic picture-in-picture in YouTube’s site settings.";
    }
    if (error?.name === "NotSupportedError" || error?.name === "SecurityError") {
      return "Picture-in-picture is unavailable in this browser or blocked by your settings.";
    }
    return "Unable to open the mini player. Play a video, wait for it to load and try again.";
  }

  async function open(automatic = false) {
    if (opening) return;
    if (automatic && !document.hidden) return;
    const customSupported = Boolean(window.documentPictureInPicture?.requestWindow && window.__floatTubeWindow);
    if (!document.pictureInPictureEnabled && !customSupported) throw new Error("This browser does not support picture-in-picture.");
    const video = findVideo();
    if (!video) throw new Error("Open a YouTube video first and wait for it to load.");
    if (pipVideo() === video) return;
    if (automatic && (!preferences.automatic || video.paused || video.ended || dismissedUntilVisible)) return;
    if (closing) throw new Error("The mini player is returning to the tab. Please try again in a moment.");
    const currentQuality = preferences.keepQuality ? readQuality(video) : null;
    const qualitySnapshot = automatic && visibleQuality && currentQuality
      && visibleQuality.video === video && visibleQuality.player === currentQuality.player
      && visibleQuality.videoId === currentQuality.videoId ? visibleQuality : currentQuality;
    opening = true;
    status = "";
    if (!disabledOverrides.has(video)) disabledOverrides.set(video, video.disablePictureInPicture);
    try {
      if (preferences.playerControls && customSupported) {
        const context = { video, player: qualityPlayer(video) };
        documentContext = context;
        try {
          const session = await window.__floatTubeWindow.open({
            video,
            captionPlayer: context.player,
            glassDesign: preferences.glassDesign,
            language: preferences.language,
            getQualities: () => getQualityOptions(video),
            selectQuality: level => selectQuality(video, level),
            onClose: () => {
              if (documentContext !== context) return;
              documentSession = null;
              documentContext = null;
              stopQuality();
              activeVideo = null;
              automaticVideo = null;
              restoreVideo(video);
              if (document.hidden) dismissedUntilVisible = true;
            }
          });
          if (session.isOpen) documentSession = session;
        } catch {
          documentContext = null;
          if (!document.pictureInPictureEnabled) throw new Error("Custom picture-in-picture is unavailable.");
          status = "Custom controls are unavailable. Using the standard mini player.";
          video.disablePictureInPicture = false;
          await video.requestPictureInPicture();
        }
      } else {
        video.disablePictureInPicture = false;
        await video.requestPictureInPicture();
      }
      if (pipVideo() === video) {
        activeVideo = video;
        automaticVideo = automatic ? video : null;
        startQuality(video, qualitySnapshot);
        if (automatic && !document.hidden && preferences.returnOnFocus) scheduleReturn();
      }
    } catch (error) {
      status = errorText(error);
      throw new Error(status);
    } finally {
      opening = false;
      // Restoring disablePictureInPicture while PiP is active can close the
      // native window. Restore only after it has actually left PiP.
      restoreVideo(video);
    }
  }

  async function close() {
    if (closing) return closing;
    if (documentSession) {
      const session = documentSession;
      session.close();
      return;
    }
    const video = document.pictureInPictureElement;
    if (!video) {
      stopQuality();
      restoreVideo(activeVideo);
      activeVideo = null;
      automaticVideo = null;
      return;
    }
    closing = (async () => {
      let timeout;
      try {
        await Promise.race([
          document.exitPictureInPicture(),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error("The browser did not close the mini player. Please try again.")), 2500);
          })
        ]);
        status = "";
      } catch (error) {
        // Auto PiP may have already been closed by the browser.
        if (document.pictureInPictureElement) {
          status = error.message || "Unable to return the video to its tab. Please try again.";
          throw new Error(status);
        }
      } finally {
        clearTimeout(timeout);
        restoreVideo(video);
        if (document.pictureInPictureElement !== video) {
          stopQuality();
          activeVideo = null;
          automaticVideo = null;
        }
      }
    })();
    try { await closing; }
    finally { closing = null; }
  }

  async function toggle() {
    // Resolve the action in the page, not from an old popup snapshot.
    if (pipVideo()) await close();
    else await open();
    return getState();
  }

  function installAutoHandler() {
    if (!navigator.mediaSession || (!document.pictureInPictureEnabled && !window.documentPictureInPicture)) return;
    try {
      // The browser grants activation to this callback when Auto PiP is eligible.
      // A visibilitychange callback alone cannot reliably request PiP.
      navigator.mediaSession.setActionHandler("enterpictureinpicture", details => {
        const automatic = details?.reason === "contentoccluded" || document.hidden;
        void open(automatic).catch(() => {});
      });
      autoSupported = true;
    } catch {
      autoSupported = false;
    }
  }

  function getState() {
    const video = findVideo();
    return {
      apiVersion: 10,
      ...preferences,
      available: Boolean(video),
      supported: Boolean(document.pictureInPictureEnabled || window.documentPictureInPicture?.requestWindow),
      active: Boolean(pipVideo()),
      autoSupported,
      title: document.title.replace(/ - YouTube$/, ""),
      qualityWarning,
      status
    };
  }

  function configure(next) {
    for (const key of Object.keys(defaults)) {
      if (typeof defaults[key] === "boolean" && typeof next?.[key] === "boolean") preferences[key] = next[key];
    }
    if (["en", "ru"].includes(next?.language)) preferences.language = next.language;
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); }
    catch { status = "Settings apply until you reload: your browser blocked site storage."; }
    installAutoHandler();
    documentSession?.setGlass?.(preferences.glassDesign);
    documentSession?.setLanguage?.(preferences.language);
    if (!preferences.keepQuality) stopQuality();
    else if (pipVideo() && !qualitySession) startQuality(pipVideo());
    return getState();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (returnTimer !== null) clearTimeout(returnTimer);
      returnTimer = null;
      return;
    }
    dismissedUntilVisible = false;
    if (automaticVideo && preferences.returnOnFocus) scheduleReturn();
  });
  document.addEventListener("leavepictureinpicture", event => {
    if (document.hidden) dismissedUntilVisible = true;
    const video = event?.target || activeVideo;
    restoreVideo(video);
    if (video === activeVideo) {
      stopQuality();
      activeVideo = null;
      automaticVideo = null;
    }
  }, true);

  // YouTube replaces media-session handlers during SPA navigation and playback.
  document.addEventListener("yt-navigate-finish", () => {
    stopQuality();
    visibleQuality = null;
    installAutoHandler();
    if (pipVideo()) startQuality(pipVideo());
  });
  document.addEventListener("timeupdate", rememberQuality, true);
  document.addEventListener("loadedmetadata", rememberQuality, true);
  document.addEventListener("resize", () => {
    if (qualitySession) enforceQuality();
    else rememberQuality();
  }, true);
  document.addEventListener("play", installAutoHandler, true);
  window.__floatTube = Object.freeze({ open, close, toggle, getState, configure });
  installAutoHandler();
  rememberQuality();
})();
