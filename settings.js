// WebAble/settings.js

/**
 * Defines the core logic for applying and removing Dyslexia Mode styles.
 * These functions are defined in the content script context (injected into the webpage).
 */

const DYSLEXIA_STYLE_ID = 'webable-dyslexia-style';

function getDyslexiaStyleText(chosenFont) {
    return `
        html, body, * {
            /* Use the saved font */
            font-family: "${chosenFont}", Arial, sans-serif !important; 
            letter-spacing: 0.06em !important;
            word-spacing: 0.12em !important;
        }
        body { background-color: #fffbe6 !important; }
        p, li { line-height: 1.6 !important; }
    `;
}

function applyDyslexiaStyles(chosenFont) {
    let style = document.getElementById(DYSLEXIA_STYLE_ID);
    if (!style) {
        style = document.createElement('style');
        style.id = DYSLEXIA_STYLE_ID;
        document.documentElement.appendChild(style);
    }
    style.textContent = getDyslexiaStyleText(chosenFont);
}

function removeDyslexiaStyles() {
    const style = document.getElementById(DYSLEXIA_STYLE_ID);
    if (style) {
        style.remove();
    }
}

/**
 * Toggles the Dyslexia mode state and applies/removes styles.
 * This is the function the popup will call via scripting.
 * @param {boolean|null} forceState - If true/false, forces the mode state. If null, toggles it.
 * @returns {Promise<boolean>} The new active state.
 */
async function toggleDyslexiaMode(forceState = null) {
    // Fetch all saved settings from storage (via service worker)
    const settings = await new Promise(resolve => {
        // Send a message to the background service worker to fetch settings
        chrome.runtime.sendMessage({ type: 'WEBABLE_GET_SETTINGS' }, resolve);
    });

    const currentState = (forceState !== null) ? forceState : !settings.isDyslexiaModeActive;
    const chosenFont = settings.selectedFont || '"Comic Sans MS", Arial, sans-serif';

    if (currentState) {
        applyDyslexiaStyles(chosenFont);
        // Save new state
        chrome.storage.sync.set({ isDyslexiaModeActive: true });
        // NOTE: The alert is now managed by the popup side for better user experience
    } else {
        removeDyslexiaStyles();
        // Save new state
        chrome.storage.sync.set({ isDyslexiaModeActive: false });
    }
    return currentState;
}


// --- INITIAL PAGE LOAD APPLICATION (UNCHANGED logic, but now uses new functions) ---
(async function applySavedSettings() {
    // 1. Check if we are already active (Contrast modes inject style tags with specific IDs)
    if (document.getElementById(DYSLEXIA_STYLE_ID) || document.getElementById('webable-contrast-style')) {
        return; // Styles already active, do nothing
    }

    // 2. Fetch all saved settings from storage (via service worker)
    const settings = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'WEBABLE_GET_SETTINGS' }, resolve);
    });

    // 3. Apply Dyslexia Mode if saved
    if (settings.isDyslexiaModeActive) {
        applyDyslexiaStyles(settings.selectedFont || '"Comic Sans MS", Arial, sans-serif');
    }

    // 4. Apply High Contrast Mode if saved
    if (settings.isContrastModeActive) {
        const style = document.createElement('style');
        style.id = 'webable-contrast-style';
        style.textContent = `
            html, body, * { 
                background: transparent !important; 
                color: #ffffff !important; 
                border-color: #ffffff !important;
            }
            body { background-color: #000000 !important; }
            a { color: #4ea3ff !important; }
            img, video, canvas, svg { filter: none !important; }
        `;
        document.documentElement.appendChild(style);
    }
})();