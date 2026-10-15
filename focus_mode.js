// focus_mode.js - WebAble Distraction-Free Reading Focus Mode
(function () {
  'use strict';

  const CONTAINER_ID = 'webable-focus-mode-container';
  const OVERLAY_ID = 'webable-focus-mode-overlay';
  const STYLE_ID = 'webable-focus-mode-style';

  function removeFocusMode() {
    const container = document.getElementById(CONTAINER_ID);
    const overlay = document.getElementById(OVERLAY_ID);
    const style = document.getElementById(STYLE_ID);
    if (container) container.remove();
    if (overlay) overlay.remove();
    if (style) style.remove();
    document.body.style.overflow = '';
    window.removeEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      removeFocusMode();
    }
  }

  function findBestContentElement() {
    // 1. Check user highlighted text first!
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.toString().trim().length > 30) {
      const wrapper = document.createElement('div');
      wrapper.appendChild(sel.getRangeAt(0).cloneContents());
      return wrapper;
    }

    // 2. Semantic containers
    const candidates = ['article', 'main', '[role="main"]', '.entry-content', '.post-content', '.article-body'];
    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim().length > 200) {
        return el.cloneNode(true);
      }
    }

    // 3. Score paragraphs to find main reading block
    const paragraphs = Array.from(document.querySelectorAll('p')).filter(p => p.innerText.trim().length > 50);
    if (paragraphs.length >= 2) {
      // Find common ancestor with most paragraphs
      const parentCounts = new Map();
      paragraphs.forEach(p => {
        const parent = p.parentElement;
        if (parent && parent !== document.body) {
          parentCounts.set(parent, (parentCounts.get(parent) || 0) + 1);
        }
      });

      let bestParent = null;
      let maxCount = 0;
      for (const [parent, count] of parentCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestParent = parent;
        }
      }

      if (bestParent) {
        return bestParent.cloneNode(true);
      }
    }

    // Fallback: document body content summary
    const fallback = document.createElement('div');
    fallback.innerHTML = '<h2>Reading Focus</h2><p>' + (document.title || 'Page Content') + '</p>';
    paragraphs.slice(0, 15).forEach(p => fallback.appendChild(p.cloneNode(true)));
    return fallback;
  }

  function applyFocusMode() {
    if (document.getElementById(CONTAINER_ID)) {
      removeFocusMode();
      return;
    }

    const content = findBestContentElement();

    // Sanitize cloned element: remove noisy clutter
    content.querySelectorAll('script, style, iframe, nav, header, footer, aside, .advertisement, [aria-hidden="true"]').forEach(el => el.remove());

    // Inject styles
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        background: rgba(10, 12, 16, 0.75);
        backdrop-filter: blur(6px);
        z-index: 999990;
        animation: webableFadeIn 0.2s ease;
      }
      #${CONTAINER_ID} {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(780px, 92vw);
        max-height: 85vh;
        background: #ffffff;
        color: #1e293b;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border-radius: 12px;
        padding: 36px 42px;
        overflow-y: auto;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 19px;
        line-height: 1.75;
        animation: webablePopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #${CONTAINER_ID} h1, #${CONTAINER_ID} h2, #${CONTAINER_ID} h3 {
        color: #0f172a;
        margin-top: 1.4em;
        margin-bottom: 0.6em;
      }
      #${CONTAINER_ID} p {
        margin-bottom: 1.2em;
      }
      #${CONTAINER_ID} a {
        color: #0284c7;
        text-decoration: underline;
      }
      .webable-focus-close-btn {
        position: absolute;
        top: 14px;
        right: 16px;
        background: #f1f5f9;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 700;
        color: #64748b;
        transition: all 0.15s ease;
      }
      .webable-focus-close-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
        transform: scale(1.05);
      }
      @keyframes webableFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes webablePopIn {
        from { transform: translate(-50%, -46%); opacity: 0; }
        to { transform: translate(-50%, -50%); opacity: 1; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.addEventListener('click', removeFocusMode);
    document.body.appendChild(overlay);

    // Create container
    const container = document.createElement('div');
    container.id = CONTAINER_ID;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'webable-focus-close-btn';
    closeBtn.title = 'Close Focus Mode (Esc)';
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.addEventListener('click', removeFocusMode);
    container.appendChild(closeBtn);

    // Body content wrapper
    const bodyWrapper = document.createElement('div');
    bodyWrapper.appendChild(content);
    container.appendChild(bodyWrapper);

    document.body.appendChild(container);
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
  }

  // Toggle
  if (document.getElementById(CONTAINER_ID)) {
    removeFocusMode();
  } else {
    applyFocusMode();
  }
})();