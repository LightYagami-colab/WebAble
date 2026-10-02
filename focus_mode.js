// focus_mode.js - Wrapped to prevent redeclaration errors

(function() {
  'use strict';
  
  const FOCUS_CONTAINER_ID = 'webable-focus-mode-container';
  const OVERLAY_ID = 'webable-focus-mode-overlay';

  function removeFocusMode() {
    const container = document.getElementById(FOCUS_CONTAINER_ID);
    const overlay = document.getElementById(OVERLAY_ID);
    if (container) container.remove();
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
    document.documentElement.style.scrollBehavior = '';
  }

  function applyFocusMode() {
    // Detect main content - try to find <main>, article, or largest <div>
    let mainContent = document.querySelector('main,article,section');
    if (!mainContent) {
      // Fallback get largest div by area
      let maxArea = 0, largestDiv = null;
      document.querySelectorAll('div').forEach(div => {
        const rect = div.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > maxArea) {
          maxArea = area;
          largestDiv = div;
        }
      });
      mainContent = largestDiv || document.body;
    }

    // Create overlay dim background
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '999998';
    overlay.style.backdropFilter = 'blur(4px)';
    document.body.appendChild(overlay);

    // Clone main content and isolate
    const container = document.createElement('div');
    container.id = FOCUS_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.maxWidth = '700px';
    container.style.width = '90%';
    container.style.height = '80vh';
    container.style.overflowY = 'auto';
    container.style.backgroundColor = '#fff';
    container.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
    container.style.padding = '20px 30px';
    container.style.zIndex = '999999';
    container.style.fontSize = '18px';
    container.style.lineHeight = '1.6';
    container.style.color = '#222';
    container.style.borderRadius = '8px';

    const clonedContent = mainContent.cloneNode(true);
    // Optional: Remove non-text heavy or distracting elements inside clonedContent
    clonedContent.querySelectorAll('script, style, nav, footer, header, aside, iframe, video, img').forEach(el => el.remove());

    container.appendChild(clonedContent);
    document.body.appendChild(container);

    // Disable page scroll behind
    document.body.style.overflow = 'hidden';
    document.documentElement.style.scrollBehavior = 'smooth';

    // Add click outside container or ESC key to exit focus mode
    overlay.addEventListener('click', removeFocusMode);
    window.addEventListener('keydown', escListener);

    function escListener(e) {
      if (e.key === 'Escape') {
        removeFocusMode();
        window.removeEventListener('keydown', escListener);
      }
    }
  }

  // Toggle focus mode
  if (document.getElementById(FOCUS_CONTAINER_ID)) {
    removeFocusMode();
  } else {
    applyFocusMode();
  }
})();