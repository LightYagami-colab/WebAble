// Run a function inside the active page
async function runInPage(fn, args = []) {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  return chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: fn,
    args
  });
}

// Function to get the currently selected font from the dropdown
function getSelectedFont() {
  const fontSelect = document.getElementById('fontSelect');
  return fontSelect ? fontSelect.value : '"Comic Sans MS", Arial, sans-serif';
}

// Initial setup: load and set saved preferences in the popup UI
document.addEventListener('DOMContentLoaded', () => {
  // Load saved preferences
  chrome.storage.sync.get(['selectedFont', 'ttsSpeed', 'isDyslexiaModeActive'], (result) => {
    const fontSelect = document.getElementById('fontSelect');
    if (fontSelect && result.selectedFont) {
      fontSelect.value = result.selectedFont;
    }
   
    // Set the speed dropdown to the saved value (UX Improvement)
    const speedSelect = document.getElementById('ttsSpeed');
    if (speedSelect && result.ttsSpeed) {
      speedSelect.value = String(result.ttsSpeed);
    }
  });
});

// Dyslexia Mode toggle - injected inline function to active page
document.getElementById('dyslexiaMode')?.addEventListener('click', async () => {
  const font = getSelectedFont();
  const results = await runInPage((chosenFont) => {
    const STYLE_ID = 'webable-dyslexia-style';
    let el = document.getElementById(STYLE_ID);
    if (el) {
      el.remove();
      if (chrome.storage && chrome.storage.sync && chrome.storage.sync.set)
        chrome.storage.sync.set({ isDyslexiaModeActive: false });
      return false;
    } else {
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = `
        html, body, * {
          font-family: "${chosenFont}", Arial, sans-serif !important;
          letter-spacing: 0.06em !important;
          word-spacing: 0.12em !important;
        }
        body { background-color: #fffbe6 !important; }
        p, li { line-height: 1.6 !important; }
      `;
      document.documentElement.appendChild(el);
      if (chrome.storage && chrome.storage.sync && chrome.storage.sync.set)
        chrome.storage.sync.set({ isDyslexiaModeActive: true });
      return true;
    }
  }, [font]);
  const isNowActive = results?.[0]?.result;
  alert(`Dyslexia Mode ${isNowActive ? 'ON' : 'OFF'}`);
});

// Real-time Dyslexia Font change on selection
document.getElementById('fontSelect')?.addEventListener('change', async (e) => {
  const newFont = e.target.value;
  chrome.storage.sync.set({ selectedFont: newFont });
 
  // Reapply dyslexia styles with the new font real-time if dyslexia mode is active
  const result = await chrome.storage.sync.get(['isDyslexiaModeActive']);
  if (result.isDyslexiaModeActive) {
    await runInPage((chosenFont) => {
      const STYLE_ID = 'webable-dyslexia-style';
      let el = document.getElementById(STYLE_ID);
      if (el) {
        el.remove();
      }
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = `
        html, body, * {
          font-family: "${chosenFont}", Arial, sans-serif !important;
          letter-spacing: 0.06em !important;
          word-spacing: 0.12em !important;
        }
        body { background-color: #fffbe6 !important; }
        p, li { line-height: 1.6 !important; }
      `;
      document.documentElement.appendChild(el);
      if (chrome.storage && chrome.storage.sync && chrome.storage.sync.set) {
        chrome.storage.sync.set({ isDyslexiaModeActive: true });
      }
    }, [newFont]);
  }
});

// Text-to-Speech play with highlighting and speed
document.getElementById('readText').addEventListener('click', () => {
  const speed = parseFloat(document.getElementById('ttsSpeed').value) || 1;
  runInPage((chosenSpeed) => {
    if (window.webableUtterance) {
      window.speechSynthesis.cancel();
      window.webableUtterance = null;
    }

    function isDarkBackground() {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      if (!bg) return false;
      const rgb = bg.match(/\d+/g);
      if (!rgb) return false;
      const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
      return (r * 0.299 + g * 0.587 + b * 0.114) < 186;
    }

    const sel = window.getSelection();
    if (!sel.rangeCount) { alert('Highlight text on the page first.'); return; }
    const text = sel.toString().trim();
    if (!text) { alert('Highlight text on the page first.'); return; }

    const wordList = text.split(/\s+/);
    const container = document.createElement('span');
    wordList.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word + ' ';
      span.setAttribute('data-word-index', i);
      container.appendChild(span);
    });

    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(container);

    const highlightColor = isDarkBackground() ? 'white' : 'yellow';
    let currentWord = 0;
    const wordSpans = container.querySelectorAll('span');

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = chosenSpeed;
    window.webableUtterance = utter;

    function clearHighlight() {
      wordSpans.forEach(s => s.style.backgroundColor = '');
    }

    utter.onboundary = (event) => {
      if (event.name === 'word') {
        clearHighlight();
        if (currentWord < wordSpans.length) {
          wordSpans[currentWord].style.backgroundColor = highlightColor;
          currentWord++;
        }
      }
    };

    utter.onend = () => {
      clearHighlight();
      container.parentNode.replaceChild(document.createTextNode(text), container);
      window.webableUtterance = null;
    };
    utter.onerror = () => {
      clearHighlight();
      container.parentNode.replaceChild(document.createTextNode(text), container);
      window.webableUtterance = null;
      alert('An error occurred during speech synthesis');
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [speed]);
});

// Pause/Resume toggle
document.getElementById('pauseResumeTTS').addEventListener('click', () => {
  runInPage(() => {
    if (!window.webableUtterance) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      window.isPaused = false;
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.isPaused = true;
    }
  });
});

// Stop
document.getElementById('stopTTS').addEventListener('click', () => {
  runInPage(() => {
    window.speechSynthesis.cancel();
    if (window.webableUtterance) {
      window.webableUtterance = null;
      window.isPaused = false;
    }
  });
});

// Save speed change to storage for persistence (optional)
document.getElementById('ttsSpeed').addEventListener('change', (e) => {
  const speed = e.target.value;
  chrome.storage.sync.set({ ttsSpeed: parseFloat(speed) });
});

// Toggle High Contrast Mode
document.getElementById('contrastMode').addEventListener('click', async () => {
  const results = await runInPage(() => {
    const STYLE_ID = 'webable-contrast-style';
    let el = document.getElementById(STYLE_ID);

    if (el) {
      el.remove();
      if (chrome.storage && chrome.storage.sync && chrome.storage.sync.set)
        chrome.storage.sync.set({ isContrastModeActive: false });
      return false;
    }

    el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      html, body, * {
        background: black !important;
        color: white !important;
        border-color: white !important;
        font-weight: 600 !important;
      }
      a, a:visited {
        color: #00ffff !important;
        text-decoration: underline !important;
      }
      a:hover, a:focus {
        background-color: #004444 !important;
        color: #ffff00 !important;
        outline: 2px solid #ffff00 !important;
      }
      button, input, select, textarea {
        background-color: black !important;
        color: white !important;
        border: 1px solid white !important;
        font-weight: 700 !important;
      }
      img, video, canvas, svg {
        filter: none !important;
        opacity: 1 !important;
      }
      ::selection {
        background: #ffff00 !important;
        color: black !important;
      }
      input:focus, select:focus, textarea:focus {
        outline: 2px solid #00ffff !important;
        background-color: #003333 !important;
      }
    `;
    document.documentElement.appendChild(el);
    if (chrome.storage && chrome.storage.sync && chrome.storage.sync.set)
      chrome.storage.sync.set({ isContrastModeActive: true });
    return true;
  });

  const isActive = results?.[0]?.result;
  alert(`High Contrast Mode ${isActive ? 'ON' : 'OFF'}`);
});

// Increase Text Size
document.getElementById('incText').addEventListener('click', () => {
  runInPage(() => {
    const root = document.documentElement;
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--webable-font-scale') || '1');
    const next = Math.min(current + 0.1, 2.0);
    root.style.setProperty('--webable-font-scale', next);
    if (!document.getElementById('webable-scale-style')) {
      const style = document.createElement('style');
      style.id = 'webable-scale-style';
      style.textContent = `html { font-size: calc(16px * var(--webable-font-scale, 1)); }`;
      document.head.appendChild(style);
    }
  });
});

// Decrease Text Size
document.getElementById('decText').addEventListener('click', () => {
  runInPage(() => {
    const root = document.documentElement;
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--webable-font-scale') || '1');
    const next = Math.max(current - 0.1, 0.6);
    root.style.setProperty('--webable-font-scale', next);
    if (!document.getElementById('webable-scale-style')) {
      const style = document.createElement('style');
      style.id = 'webable-scale-style';
      style.textContent = `html { font-size: calc(16px * var(--webable-font-scale, 1)); }`;
      document.head.appendChild(style);
    }
  });
});

// Reset Styles
document.getElementById('resetStyles').addEventListener('click', () => {
  runInPage(() => {
    ['webable-dyslexia-style', 'webable-contrast-style', 'webable-scale-style']
      .forEach(id => document.getElementById(id)?.remove());
    document.documentElement.style.removeProperty('--webable-font-scale');
    window.speechSynthesis.cancel();
  });
  // Clear stored modes
  chrome.storage.sync.set({ isDyslexiaModeActive: false, isContrastModeActive: false });
  alert('All styles reset');
});

document.getElementById('focusMode').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['focus_mode.js']
  });
});

document.getElementById('aiToggle').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async () => {
      const FLAG_ID = 'web_api_ai_desc_flag';
      const STYLE_ID = 'web_api_ai_desc_style';
      const MODAL_ID = 'ai-caption-modal-overlay';

      if (document.getElementById(FLAG_ID)) {
        // Disable: Remove all AI descriptions
        document.querySelectorAll('.web_api_ai_caption').forEach(e => e.remove());
        document.querySelectorAll('.web_api_ai_wrapper').forEach(wrapper => {
          const img = wrapper.querySelector('img');
          if (img) wrapper.replaceWith(img);
        });
        document.getElementById(FLAG_ID)?.remove();
        document.getElementById(STYLE_ID)?.remove();
        document.getElementById(MODAL_ID)?.remove();
        alert('AI descriptions disabled');
        return;
      }

      // Enable flag and styles
      const flag = document.createElement('div');
      flag.id = FLAG_ID;
      flag.style.display = 'none';
      document.body.appendChild(flag);

      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
          .web_api_ai_wrapper {
            display: inline-block;
            text-align: center;
            margin-bottom: 1em;
            position: relative;
            cursor: pointer;
          }
          .web_api_ai_wrapper img {
            transition: filter 0.2s ease;
          }
          .web_api_ai_wrapper:hover img {
            filter: brightness(0.9);
          }
          .web_api_ai_caption {
            margin-top: 0.2em;
            font-style: italic;
            font-size: 12px;
            color: #444;
            background: #f9f9f9;
            border-radius: 3px;
            padding: 3px 6px;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
            box-shadow: 1px 1px 3px #ccc;
          }
          .ai-image-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
          }
          .ai-image-modal-overlay.active {
            opacity: 1;
            visibility: visible;
          }
          .ai-caption-box {
            background: rgba(255, 255, 255, 0.95);
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
          }
          @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .ai-caption-box p {
            font-size: 20px;
            line-height: 1.6;
            color: #333;
            margin: 0;
            font-weight: 500;
          }
        `;
        document.head.appendChild(style);
      }

      // Create modal overlay
      if (!document.getElementById(MODAL_ID)) {
        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'ai-image-modal-overlay';
        modal.innerHTML = '<div class="ai-caption-box"><p id="modal-description"></p></div>';
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('active');
          }
        });
        document.body.appendChild(modal);
      }

      // Get ALL images from the webpage
      const images = Array.from(document.images).filter(img => {
        if (!img.src || img.src.startsWith('data:')) return false;
        const rect = img.getBoundingClientRect();
        return rect.width >= 50 && rect.height >= 50;
      });

      const urls = images.map(img => img.src);

      if (urls.length === 0) {
        alert('No eligible images found.');
        return;
      }

      alert(`Processing ${urls.length} images. This may take a moment...`);

      // Process images in batches (API friendly)
      const batchSize = 20;
      const allResults = [];

      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'WEBABLE_CAPTION_URLS', urls: batch }, (response) => {
            if (response && response.ok) {
              allResults.push(...response.results);
            } else {
              console.error('Batch error:', response?.error);
            }
            resolve();
          });
        });
      }

      const mapUrlToCaption = new Map(allResults.map(r => [r.url, r.caption]));
      const modal = document.getElementById(MODAL_ID);

      images.forEach(img => {
        const captionText = mapUrlToCaption.get(img.src) || 'No description available';
        let wrapper = img.closest('.web_api_ai_wrapper');

        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'web_api_ai_wrapper';
          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        }

        const captionElem = document.createElement('div');
        captionElem.className = 'web_api_ai_caption';
        captionElem.textContent = captionText;
        wrapper.appendChild(captionElem);

        if (!img.alt) {
          img.alt = captionText;
        }

        // Add hover event to show modal with ONLY caption
        wrapper.addEventListener('mouseenter', () => {
          document.getElementById('modal-description').textContent = captionText;
          modal.classList.add('active');
        });

        wrapper.addEventListener('mouseleave', () => {
          modal.classList.remove('active');
        });
      });

      alert(`AI descriptions enabled for ${images.length} images.`);
    }
  });
});