// popup.js - WebAble Extension Controller

// Utility to run code in active tab
async function runInActiveTab(fn, args = []) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      showStatus('Cannot run on browser system pages', 'error');
      return null;
    }
    return await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fn,
      args
    });
  } catch (err) {
    console.error('Error executing script:', err);
    showStatus('Action failed on this tab', 'error');
    return null;
  }
}

// UI Status Banner Helper (No annoying alert() dialogs!)
function showStatus(text, type = 'normal') {
  const banner = document.getElementById('statusIndicator');
  if (!banner) return;
  banner.textContent = text;
  banner.className = 'status-banner ' + (type === 'error' ? 'error' : type === 'active' ? 'active' : '');

  clearTimeout(window._statusTimer);
  window._statusTimer = setTimeout(() => {
    banner.textContent = 'Ready';
    banner.className = 'status-banner';
  }, 3200);
}

// Initial setup: load preferences and reflect in UI
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(
    [
      'isDyslexiaModeActive',
      'selectedFont',
      'isContrastModeActive',
      'fontScale',
      'ttsSpeed',
      'hfApiKey',
      'isAiDescriptionsActive'
    ],
    (data) => {
      // Dyslexia state
      updateToggleUI('dyslexiaMode', !!data.isDyslexiaModeActive);

      // Selected Font
      const fontSelect = document.getElementById('fontSelect');
      if (fontSelect && data.selectedFont) {
        fontSelect.value = data.selectedFont;
      }

      // Contrast state
      updateToggleUI('contrastMode', !!data.isContrastModeActive);

      // AI Vision state
      updateToggleUI('aiToggle', !!data.isAiDescriptionsActive);

      // TTS speed
      const ttsSpeed = document.getElementById('ttsSpeed');
      if (ttsSpeed && data.ttsSpeed) {
        ttsSpeed.value = String(data.ttsSpeed);
      }

      // Font scale
      const scale = data.fontScale || 1.0;
      updateScaleDisplay(scale);

      // API Key
      const hfApiKey = document.getElementById('hfApiKey');
      if (hfApiKey && data.hfApiKey) {
        hfApiKey.value = data.hfApiKey;
      }
    }
  );
});

function updateToggleUI(buttonId, isActive) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  const stateBadge = btn.querySelector('.toggle-state');
  if (stateBadge) {
    stateBadge.textContent = isActive ? 'ON' : 'OFF';
  }
}

function updateScaleDisplay(scale) {
  const display = document.getElementById('scaleDisplay');
  if (display) {
    display.textContent = `Scale: ${Math.round(scale * 100)}%`;
  }
}

// --- 1. Dyslexia Mode ---
document.getElementById('dyslexiaMode')?.addEventListener('click', async () => {
  const current = document.getElementById('dyslexiaMode').getAttribute('aria-pressed') === 'true';
  const next = !current;
  const chosenFont = document.getElementById('fontSelect')?.value || 'Comic Sans MS';

  await chrome.storage.sync.set({
    isDyslexiaModeActive: next,
    selectedFont: chosenFont
  });

  updateToggleUI('dyslexiaMode', next);
  showStatus(`Dyslexia Mode ${next ? 'Enabled' : 'Disabled'}`, next ? 'active' : 'normal');
});

// Font family change
document.getElementById('fontSelect')?.addEventListener('change', async (e) => {
  const newFont = e.target.value;
  await chrome.storage.sync.set({ selectedFont: newFont });
  showStatus(`Font set to ${newFont}`);
});

// --- 2. High Contrast Mode ---
document.getElementById('contrastMode')?.addEventListener('click', async () => {
  const current = document.getElementById('contrastMode').getAttribute('aria-pressed') === 'true';
  const next = !current;

  await chrome.storage.sync.set({ isContrastModeActive: next });
  updateToggleUI('contrastMode', next);
  showStatus(`High Contrast ${next ? 'Enabled' : 'Disabled'}`, next ? 'active' : 'normal');
});

// --- 3. Text Sizing Controls ---
document.getElementById('incText')?.addEventListener('click', async () => {
  const data = await chrome.storage.sync.get(['fontScale']);
  const current = data.fontScale || 1.0;
  const next = Math.min(Math.round((current + 0.1) * 10) / 10, 2.0);
  await chrome.storage.sync.set({ fontScale: next });
  updateScaleDisplay(next);
  showStatus(`Scale: ${Math.round(next * 100)}%`);
});

document.getElementById('decText')?.addEventListener('click', async () => {
  const data = await chrome.storage.sync.get(['fontScale']);
  const current = data.fontScale || 1.0;
  const next = Math.max(Math.round((current - 0.1) * 10) / 10, 0.7);
  await chrome.storage.sync.set({ fontScale: next });
  updateScaleDisplay(next);
  showStatus(`Scale: ${Math.round(next * 100)}%`);
});

// --- 4. Global Reset ---
document.getElementById('resetStyles')?.addEventListener('click', async () => {
  await chrome.storage.sync.set({
    isDyslexiaModeActive: false,
    isContrastModeActive: false,
    fontScale: 1.0
  });

  updateToggleUI('dyslexiaMode', false);
  updateToggleUI('contrastMode', false);
  updateScaleDisplay(1.0);

  // Stop any active TTS in page
  runInActiveTab(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const bar = document.getElementById('webable-tts-bar');
    if (bar) bar.remove();
  });

  showStatus('All accessibility styles reset');
});

// --- 5. Distraction-Free Focus Mode ---
document.getElementById('focusMode')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['focus_mode.js']
  });
  showStatus('Toggled Focus Mode');
});

// --- 6. Non-Destructive Text-to-Speech (TTS) ---
document.getElementById('readText')?.addEventListener('click', async () => {
  const speed = parseFloat(document.getElementById('ttsSpeed')?.value) || 1.0;
  showStatus('Reading text...');

  await runInActiveTab((chosenSpeed) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (window._webableKeepAlive) {
      clearInterval(window._webableKeepAlive);
    }

    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';

    if (!text) {
      alert('Please highlight some text on the webpage first!');
      return;
    }

    // Clean up any old subtitle bar
    let bar = document.getElementById('webable-tts-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'webable-tts-bar';
      bar.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 28px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        z-index: 1000000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 15px;
        max-width: 90vw;
        max-height: 120px;
        overflow-y: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.15);
      `;
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <span style="color: #38bdf8; font-weight: 700; flex-shrink: 0;">🔊 WebAble:</span>
      <div id="webable-tts-text-content" style="line-height: 1.5; flex-grow: 1;"></div>
      <button id="webable-tts-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 0 4px;" title="Dismiss">&#x2715;</button>
    `;

    document.getElementById('webable-tts-close-btn')?.addEventListener('click', () => {
      window.speechSynthesis.cancel();
      bar.remove();
    });

    const textContentEl = document.getElementById('webable-tts-text-content');
    const words = text.split(/\s+/);
    textContentEl.innerHTML = words.map((w, idx) => `<span id="webable-word-${idx}">${w} </span>`).join('');

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = chosenSpeed;
    let wordIndex = 0;

    utter.onboundary = (event) => {
      if (event.name === 'word') {
        // Reset previous word
        document.querySelectorAll('#webable-tts-text-content span').forEach(s => {
          s.style.backgroundColor = 'transparent';
          s.style.color = '#ffffff';
          s.style.borderRadius = '0';
        });

        const activeSpan = document.getElementById(`webable-word-${wordIndex}`);
        if (activeSpan) {
          activeSpan.style.backgroundColor = '#facc15';
          activeSpan.style.color = '#000000';
          activeSpan.style.borderRadius = '3px';
          activeSpan.style.padding = '0 2px';
          activeSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        wordIndex++;
      }
    };

    utter.onend = () => {
      if (window._webableKeepAlive) clearInterval(window._webableKeepAlive);
      setTimeout(() => {
        const b = document.getElementById('webable-tts-bar');
        if (b) b.remove();
      }, 1500);
    };

    utter.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (window._webableKeepAlive) clearInterval(window._webableKeepAlive);
      const b = document.getElementById('webable-tts-bar');
      if (b) b.remove();
    };

    // Keepalive heartbeat to overcome Chromium 14-second freeze bug
    window._webableKeepAlive = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    window.speechSynthesis.speak(utter);
  }, [speed]);
});

// Pause / Resume TTS
document.getElementById('pauseResumeTTS')?.addEventListener('click', async () => {
  await runInActiveTab(() => {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  });
  showStatus('Toggled Pause / Resume');
});

// Stop TTS
document.getElementById('stopTTS')?.addEventListener('click', async () => {
  await runInActiveTab(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (window._webableKeepAlive) {
      clearInterval(window._webableKeepAlive);
    }
    const bar = document.getElementById('webable-tts-bar');
    if (bar) bar.remove();
  });
  showStatus('Stopped speech');
});

// Speed selection change
document.getElementById('ttsSpeed')?.addEventListener('change', async (e) => {
  const speed = parseFloat(e.target.value) || 1.0;
  await chrome.storage.sync.set({ ttsSpeed: speed });
  showStatus(`Speed set to ${speed}x`);
});

// --- 7. AI Vision Helper ---
document.getElementById('aiToggle')?.addEventListener('click', async () => {
  const current = document.getElementById('aiToggle').getAttribute('aria-pressed') === 'true';
  const next = !current;

  showStatus(next ? 'Analyzing images...' : 'Disabling captions...');

  await runInActiveTab(async (enable) => {
    const BADGE_CLASS = 'webable-ai-caption-badge';
    const STYLE_ID = 'webable-ai-desc-style';

    if (!enable) {
      document.querySelectorAll('.' + BADGE_CLASS).forEach(el => el.remove());
      document.getElementById(STYLE_ID)?.remove();
      return;
    }

    // Add badge styles
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .${BADGE_CLASS} {
          display: block;
          margin-top: 4px;
          margin-bottom: 8px;
          padding: 4px 8px;
          background: #f1f5f9;
          color: #334155;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 11px;
          font-style: italic;
          line-height: 1.4;
          border-left: 3px solid #0284c7;
          border-radius: 2px 4px 4px 2px;
          max-width: 500px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    // Find eligible images
    const images = Array.from(document.images).filter(img => {
      if (!img.src || img.src.startsWith('data:')) return false;
      const rect = img.getBoundingClientRect();
      return rect.width >= 40 && rect.height >= 40;
    });

    if (images.length === 0) {
      alert('No eligible web images found on this page.');
      return;
    }

    const urls = images.slice(0, 30).map(i => i.src);

    chrome.runtime.sendMessage({ type: 'WEBABLE_CAPTION_URLS', urls }, (response) => {
      if (!response?.ok || !response.results) {
        console.error('Caption error:', response?.error);
        return;
      }

      const map = new Map(response.results.map(r => [r.url, r.caption]));

      images.forEach(img => {
        const caption = map.get(img.src);
        if (!caption) return;

        // Update alt attribute for screen readers
        if (!img.alt || img.alt.trim() === '') {
          img.alt = caption;
        }

        // Attach visible badge if not already added
        if (!img.nextElementSibling?.classList?.contains(BADGE_CLASS)) {
          const badge = document.createElement('div');
          badge.className = BADGE_CLASS;
          badge.setAttribute('role', 'note');
          badge.innerHTML = `<strong>Alt Description:</strong> ${caption}`;
          img.parentNode?.insertBefore(badge, img.nextSibling);
        }
      });
    });
  }, [next]);

  await chrome.storage.sync.set({ isAiDescriptionsActive: next });
  updateToggleUI('aiToggle', next);
  showStatus(next ? 'AI Captions Generated' : 'AI Captions Cleared', next ? 'active' : 'normal');
});

// Custom API key save
document.getElementById('saveApiKey')?.addEventListener('click', async () => {
  const key = document.getElementById('hfApiKey')?.value?.trim() || '';
  await chrome.storage.sync.set({ hfApiKey: key });
  showStatus(key ? 'API Key Saved' : 'Custom key removed');
});