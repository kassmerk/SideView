(() => {
  "use strict";
  if (globalThis.FloatTubeI18n) return;
  const ru = {
    "Mini player": "Мини-плеер",
    "Language": "Язык",
    "Choose language": "Выбрать язык",
    "Glass design": "Стеклянный дизайн",
    "Translucent mini-player controls": "Полупрозрачное управление плеером",
    "Player controls": "Управление плеером",
    "Volume, seeking and quality inside PiP": "Громкость, перемотка и качество в окне",
    "Keep video quality": "Сохранять качество видео",
    "Preserve current resolution in PiP": "Сохранять разрешение в мини-плеере",
    "Automatic PiP": "Автоматический мини-плеер",
    "When you leave the video": "При уходе со вкладки с видео",
    "Return to tab": "Возвращать во вкладку",
    "When you come back to YouTube": "При возвращении на YouTube",
    "Automatic PiP help": "Помощь с автоматическим режимом",
    "Open mini player ↗": "Открыть мини-плеер ↗",
    "Return video to tab": "Вернуть видео во вкладку",
    "Play a video on YouTube": "Запусти видео на YouTube",
    "Open a video on YouTube": "Открой видео на YouTube",
    "Loading…": "Загрузка…",
    "Automatic PiP requires permission from your browser.": "Для автоматического режима нужно разрешение браузера.",
    "Mini player is open. You can minimize your browser.": "Мини-плеер открыт. Можно свернуть браузер.",
    "This browser does not support picture-in-picture.": "Браузер не поддерживает картинку в картинке.",
    "Manual mode is available. This browser does not support automatic PiP.": "Доступно ручное открытие. Браузер не поддерживает автоматический режим.",
    "Refresh your YouTube tab": "Обнови вкладку YouTube",
    "This tab is running an older SideView script. Reload YouTube to enable the updated settings.": "Во вкладке работает старая версия SideView. Обнови YouTube для новых настроек.",
    "This YouTube tab needs a refresh": "Нужно обновить вкладку YouTube",
    "It is still running an older version of SideView. Reload the tab, then open SideView again. Playback may restart.": "Во вкладке осталась старая версия SideView. Обнови страницу и открой расширение снова. Воспроизведение может начаться заново.",
    "Reload YouTube tab": "Обновить вкладку YouTube",
    "YouTube is reloading. Open SideView again once the video has loaded.": "YouTube обновляется. Открой SideView снова после загрузки видео.",
    "Unable to reload the tab. Switch to YouTube and press F5, then open SideView again.": "Не удалось обновить вкладку. Нажми F5 на YouTube и снова открой SideView.",
    "Open a YouTube tab": "Открой вкладку YouTube",
    "Go to youtube.com, play a video and click the SideView icon.": "Открой youtube.com, запусти видео и нажми значок SideView.",
    "Unable to connect": "Не удалось подключиться",
    "Getting started": "Как начать",
    "Current video": "Текущее видео",
    "Tab update required": "Нужно обновить вкладку",
    "Extension installation": "Установка расширения",
    "Install SideView as an extension": "Установи SideView как расширение",
    "Open SideView from your toolbar": "Открой SideView на панели браузера",
    "This page has no access to extension APIs. Opening popup.html as a regular file will not run the mini player. Follow the steps below.": "Эта страница не имеет доступа к API расширений. Открытие popup.html как обычного файла не запускает мини-плеер. Выполни шаги ниже.",
    "Enter": "Введи",
    "or": "или",
    "in the address bar.": "в адресной строке.",
    "Enable “Developer mode” and click “Load unpacked”.": "Включи «Режим разработчика» и нажми «Загрузить распакованное расширение».",
    "Select the": "Выбери папку",
    "folder containing": "с файлом",
    "Play a YouTube video, then open SideView from the browser’s extensions menu (the puzzle icon).": "Запусти видео YouTube и открой SideView через меню расширений браузера (значок пазла).",
    "Reload the YouTube tab after installing the extension.": "Обнови вкладку YouTube после установки расширения.",
    "Unable to complete this action.": "Не удалось выполнить действие.",
    "This tab is unavailable. Open YouTube again.": "Вкладка недоступна. Открой YouTube снова.",
    "Your browser blocked PiP. Try clicking the button again or allow automatic picture-in-picture in YouTube’s site settings.": "Браузер заблокировал мини-плеер. Нажми кнопку ещё раз или разреши автоматическую картинку в картинке в настройках YouTube.",
    "Picture-in-picture is unavailable in this browser or blocked by your settings.": "Картинка в картинке недоступна или запрещена настройками браузера.",
    "Unable to open the mini player. Play a video, wait for it to load and try again.": "Не удалось открыть мини-плеер. Запусти видео, дождись загрузки и повтори.",
    "Open a YouTube video first and wait for it to load.": "Сначала открой видео YouTube и дождись загрузки.",
    "The mini player is returning to the tab. Please try again in a moment.": "Видео возвращается во вкладку. Попробуй снова через мгновение.",
    "The browser did not close the mini player. Please try again.": "Браузер не закрыл мини-плеер. Попробуй ещё раз.",
    "Unable to return the video to its tab. Please try again.": "Не удалось вернуть видео во вкладку. Попробуй ещё раз.",
    "Settings apply until you reload: your browser blocked site storage.": "Настройки действуют до обновления страницы: браузер запретил сохранение данных сайта.",
    "Settings": "Настройки",
    "Playback speed": "Скорость воспроизведения",
    "Sleep timer": "Таймер сна",
    "Quality": "Качество",
    "Normal": "Обычная",
    "Off": "Выкл.",
    "On": "Вкл.",
    "Auto": "Авто",
    "Highest": "Максимальное",
    "Play": "Воспроизвести",
    "Pause": "Пауза",
    "Mute": "Выключить звук",
    "Unmute": "Включить звук",
    "Volume": "Громкость",
    "Seek video": "Перемотка видео",
    "Toggle subtitles": "Включить или выключить субтитры",
    "Subtitles · On / Off": "Субтитры · Вкл. / Выкл.",
    "Player settings": "Настройки плеера",
    "Collapse controls": "Свернуть управление",
    "Show controls": "Показать управление",
    "Close mini player": "Закрыть мини-плеер",
    "LIVE": "ЭФИР",
    "Sleep timer finished. Video paused.": "Таймер сна сработал. Видео на паузе.",
    "Unable to play. Return to the YouTube tab and try again.": "Не удалось запустить видео. Вернись во вкладку YouTube и повтори.",
    "Press Play to resume the video.": "Нажми «Воспроизвести», чтобы продолжить.",
    "Unable to change subtitles for this video. Please try again.": "Не удалось переключить субтитры. Попробуй ещё раз.",
    "Quality control is unavailable for this video. Use YouTube settings.": "Выбор качества недоступен. Используй настройки YouTube.",
    "YouTube could not apply this quality. Try selecting it on YouTube.": "YouTube не применил качество. Попробуй выбрать его на YouTube.",
    "Quality control is unavailable. Choose a fixed quality in YouTube settings.": "Управление качеством недоступно. Выбери разрешение в настройках YouTube.",
    "The saved quality is no longer available for this video.": "Сохранённое качество больше недоступно для этого видео.",
    "YouTube has not applied the saved quality yet. Check the stream and your connection.": "YouTube пока не применил сохранённое качество. Проверь доступные разрешения и соединение.",
    "Custom controls are unavailable. Using the standard mini player.": "Своя панель управления недоступна. Открыт стандартный мини-плеер.",
    "In Chrome, open YouTube’s site settings using the icon next to the address and allow “Automatic picture-in-picture”, if available. Play a video with sound, then minimize the browser or switch tabs.": "В Chrome открой настройки сайта YouTube через значок рядом с адресом и разреши автоматическую картинку в картинке, если этот пункт доступен. Запусти видео со звуком и сверни браузер или смени вкладку.",
    "Availability depends on your browser version and settings. If no window appears, use the button above. Automatic PiP may not be available in Edge.": "Доступность зависит от версии и настроек браузера. Если окно не появилось, нажми кнопку выше. В Edge автоматический режим может быть недоступен."
  };
  function t(text, language = "en") {
    if (language !== "ru" || typeof text !== "string") return text;
    if (ru[text]) return ru[text];
    if (text.startsWith("‹ ")) return `‹ ${t(text.slice(2), language)}`;
    if (/^\d+ min ›$/.test(text)) return text.replace(" min", " мин");
    if (text.endsWith(" ›")) return `${t(text.slice(0, -2), language)} ›`;
    if (/^\d+ minutes$/.test(text)) return text.replace(" minutes", " минут");
    return text.replace(/LIVE$/, "ЭФИР");
  }
  const originals = new WeakMap();
  function translateValue(node, key, value, language, write) {
    let saved = originals.get(node);
    if (!saved) { saved = {}; originals.set(node, saved); }
    const record = saved[key];
    const source = record && value === record.last ? record.source : value;
    const result = t(source, language);
    saved[key] = { source, last: result };
    if (result !== value) write(result);
  }
  function localize(root, language) {
    if (!root) return;
    if (root.nodeType === 3) {
      const text = root.nodeValue;
      const trimmed = text.trim();
      translateValue(root, "text", trimmed, language, value => { root.nodeValue = text.replace(trimmed, value); });
      return;
    }
    if (["SCRIPT", "STYLE", "VIDEO", "SVG"].includes(root.tagName) || root.id === "video-title" || root.className === "captions") return;
    for (const name of ["title", "aria-label"]) {
      const value = root.getAttribute?.(name);
      if (value) translateValue(root, name, value, language, text => root.setAttribute(name, text));
    }
    for (const child of Array.from(root.childNodes || root.children || [])) localize(child, language);
    if (!root.childNodes && !root.children?.length && root.textContent) {
      translateValue(root, "text", root.textContent, language, value => { root.textContent = value; });
    }
  }
  function watch(root, getLanguage) {
    if (!root || typeof MutationObserver === "undefined") return null;
    const observer = new MutationObserver(() => localize(root, getLanguage()));
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label"] });
    return observer;
  }
  globalThis.FloatTubeI18n = Object.freeze({ t, localize, watch });
})();
