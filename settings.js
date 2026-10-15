// settings.js - WebAble Content Script for Accessibility Styles
(function () {
  'use strict';

  const DYSLEXIA_STYLE_ID = 'webable-dyslexia-style';
  const CONTRAST_STYLE_ID = 'webable-contrast-style';
  const SCALE_STYLE_ID = 'webable-scale-style';

  function getDyslexiaCss(chosenFont) {
    const font = chosenFont || 'Arial';
    return `
      html, body, p, span, a, li, h1, h2, h3, h4, h5, h6, input, button, textarea, select {
        font-family: "${font}", Arial, sans-serif !important;
        letter-spacing: 0.07em !important;
        word-spacing: 0.14em !important;
        line-height: 1.65 !important;
      }
      body {
        background-color: #fcf8e8 !important;
      }
      p, li {
        max-width: 85ch !important;
      }
    `;
  }

  function getContrastCss() {
    return `
      html, body {
        background-color: #0d0d0d !important;
        color: #f5f5f5 !important;
      }
      div, section, article, nav, aside, header, footer, main, ul, ol, li {
        background-color: #0d0d0d !important;
        color: #f5f5f5 !important;
        border-color: #383838 !important;
      }
      p, span, h1, h2, h3, h4, h5, h6, label {
        color: #ffffff !important;
      }
      a, a:visited {
        color: #58a6ff !important;
        text-decoration: underline !important;
      }
      a:hover, a:focus {
        color: #ffff00 !important;
        outline: 2px solid #ffff00 !important;
        background-color: #1a2a3a !important;
      }
      button, input, select, textarea {
        background-color: #1f1f1f !important;
        color: #ffffff !important;
        border: 2px solid #888888 !important;
        border-radius: 4px !important;
      }
      button:focus, input:focus, select:focus, textarea:focus {
        outline: 3px solid #00ffff !important;
        border-color: #00ffff !important;
      }
      ::selection {
        background: #ffff00 !important;
        color: #000000 !important;
      }
      img, video, canvas, svg {
        filter: contrast(1.1) brightness(0.95) !important;
        opacity: 0.95 !important;
      }
    `;
  }

  function applyDyslexiaStyle(isActive, font) {
    let el = document.getElementById(DYSLEXIA_STYLE_ID);
    if (isActive) {
      if (!el) {
        el = document.createElement('style');
        el.id = DYSLEXIA_STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
      }
      el.textContent = getDyslexiaCss(font);
    } else if (el) {
      el.remove();
    }
  }

  function applyContrastStyle(isActive) {
    let el = document.getElementById(CONTRAST_STYLE_ID);
    if (isActive) {
      if (!el) {
        el = document.createElement('style');
        el.id = CONTRAST_STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
      }
      el.textContent = getContrastCss();
    } else if (el) {
      el.remove();
    }
  }

  function applyFontScale(scale) {
    let el = document.getElementById(SCALE_STYLE_ID);
    if (scale && scale !== 1.0) {
      document.documentElement.style.setProperty('--webable-font-scale', scale);
      if (!el) {
        el = document.createElement('style');
        el.id = SCALE_STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
      }
      el.textContent = `
        html {
          font-size: calc(16px * var(--webable-font-scale, 1)) !important;
        }
      `;
    } else {
      document.documentElement.style.removeProperty('--webable-font-scale');
      if (el) el.remove();
    }
  }

  // Load and apply initial state on page load
  function initStyles() {
    chrome.storage.sync.get(
      ['isDyslexiaModeActive', 'isContrastModeActive', 'selectedFont', 'fontScale'],
      (settings) => {
        if (!settings) return;
        if (settings.isDyslexiaModeActive) {
          applyDyslexiaStyle(true, settings.selectedFont);
        }
        if (settings.isContrastModeActive) {
          applyContrastStyle(true);
        }
        if (settings.fontScale && settings.fontScale !== 1) {
          applyFontScale(settings.fontScale);
        }
      }
    );
  }

  // Real-time synchronization when settings are updated from popup
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;

    if (changes.isDyslexiaModeActive || changes.selectedFont) {
      chrome.storage.sync.get(['isDyslexiaModeActive', 'selectedFont'], (res) => {
        applyDyslexiaStyle(!!res.isDyslexiaModeActive, res.selectedFont);
      });
    }

    if (changes.isContrastModeActive) {
      applyContrastStyle(changes.isContrastModeActive.newValue);
    }

    if (changes.fontScale) {
      applyFontScale(changes.fontScale.newValue);
    }
  });

  // Run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStyles);
  } else {
    initStyles();
  }
})();