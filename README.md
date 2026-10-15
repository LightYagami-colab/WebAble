# WebAble 🌐♿

> **Making the web accessible, readable, and inclusive for everyone.**

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![AI Powered](https://img.shields.io/badge/AI%20Vision-Hugging%20Face%20ViT--GPT2-FFD21E?logo=huggingface&logoColor=black)](https://huggingface.co/nlpconnect/vit-gpt2-image-captioning)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%20Focused-008080?logo=w3c&logoColor=white)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Overview

**WebAble** is a comprehensive browser accessibility extension built for Google Chrome (Manifest V3). Designed for individuals with dyslexia, visual impairments, ADHD, or cognitive processing needs, WebAble transforms noisy web pages into clear, customizable, and readable environments.

With native **Text-to-Speech with real-time word tracking**, customizable **Dyslexia typography**, **High-Contrast viewing**, an isolated **Distraction-Free Focus Mode**, and **AI-driven automatic image captioning**, WebAble empowers users to experience the internet on their own terms.

---

## ✨ Features

### 🗣️ Synchronized Text-to-Speech (TTS)
- **Highlighted Text Reading**: Simply highlight any passage on any webpage and click **Read Highlighted Text**.
- **Real-Time Word-by-Word Karaoke Highlighting**: Visually tracks the active spoken word in real time with theme-aware contrast (yellow for light mode, white for dark mode).
- **Full Playback Controls**: Dedicated **Pause**, **Resume**, and **Stop** buttons.
- **Speed Control**: Adjust playback velocity (`0.5x`, `1.0x`, `1.5x`), automatically saved across browsing sessions.

### 📖 Dyslexia-Friendly Reader
- **Specialized Fonts**: Choose between **Comic Sans MS**, **OpenDyslexic**, and **Arial**.
- **Enhanced Legibility**: Applies optimized letter spacing (`0.06em`), word spacing (`0.12em`), and comfortable line heights (`1.6`).
- **Warm Contrast Background**: Injects a soft cream background tint (`#fffbe6`) designed to reduce visual stress and glare.
- **Dynamic Instant Switching**: Adjust fonts on the fly; changes apply instantly without requiring a page refresh.

### 🌗 High Contrast Mode
- **Zero-Glare Inversion**: Converts light backgrounds to pitch black (`#000000`) and high-visibility white text.
- **Enhanced Link & Focus Visibility**: Links glow in cyan (`#00ffff`) with yellow outlines (`#ffff00`) on active interaction.
- **Media Preservation**: Intelligently safeguards photos, videos, canvases, and SVGs so colors remain natural while surrounding UI elements are inverted.

### 🎯 Reading Focus Mode
- **Distraction Elimination**: Intelligently detects the page's primary article or main container and centers it in a clean reading card.
- **Ambient Backdrop Dimming**: Dims external ads, navigation sidebars, and banners with a darkened, 4px-blurred overlay.
- **Quick Dismiss**: Exit instantly by tapping `ESC` or clicking anywhere on the dimmed background.

### 🔍 Dynamic Text Scaling & Global Reset
- **Granular Scaling**: Increase (`A+`) or decrease (`A-`) page typography smoothly across all elements using CSS custom properties (`--webable-font-scale`).
- **One-Click Reset**: Clear all active visual modifications, text scales, and audio queues back to default with **Reset Styles**.

### 🤖 AI-Powered Image Captioning
- **Automatic Alt-Text Generation**: Scans page images and leverages state-of-the-art vision models via Hugging Face (`nlpconnect/vit-gpt2-image-captioning`).
- **Interactive Caption Cards**: Injects clean, legible descriptions below images and updates empty `alt` attributes for screen readers.
- **Modal Preview**: Hover over any image to reveal an amplified focus modal displaying the full AI description.
- **Heuristic Fallback Engine**: If an image cannot be processed by the API, WebAble extracts smart contextual cues from asset paths (e.g., avatars, icons, logos, banners).

---

## 🛠️ Project Structure

```text
WebAble/
├── manifest.json        # Extension Manifest V3 configuration & permissions
├── popup.html           # Popup UI layout and control panels
├── popup.js             # UI event handling, TTS logic, and content injections
├── style.css            # Extension popup styling (modern, accessible card design)
├── service_worker.js    # Background worker for API calls & storage queries
├── settings.js          # Injected content script for style persistence
├── focus_mode.js        # Distraction-free reader mode overlay injection
├── config.js            # Configuration constants & settings
├── icon16.png           # 16x16 extension icon
├── icon32.png           # 32x32 extension icon
├── icon48.png           # 48x48 extension icon
└── icon128.png          # 128x128 extension icon
```

---

## 🚀 Installation & Setup

WebAble can be loaded unpacked into any Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi).

### Prerequisites
- Google Chrome (or any Chromium browser supporting Manifest V3)
- An active internet connection for AI image description queries

### Step-by-Step Installation

1. **Clone or Download the Repository**:
   ```bash
   git clone https://github.com/your-username/WebAble.git
   ```
   *(Or download and extract the ZIP file)*

2. **Open Extensions Management**:
   - Navigate to `chrome://extensions` in your browser address bar.

3. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch located in the top-right corner.

4. **Load Unpacked Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `WebAble` directory containing `manifest.json`.

5. **Pin WebAble**:
   - Click the puzzle icon (Extensions) in your browser toolbar and pin **WebAble** for easy 1-click access.

---

## ⚙️ Configuration & API Key

WebAble uses Hugging Face's Inference API for generating image captions, with an intelligent fallback heuristic engine when no key is provided.

To use your own API key:
1. Obtain a free access token from [Hugging Face Tokens](https://huggingface.co/settings/tokens).
2. Open the **WebAble** popup.
3. Expand **Custom Hugging Face Token (Optional)** at the bottom.
4. Paste your token and click **Save Key**. The key is securely stored in `chrome.storage.sync` without modifying any code.

---

## 🔒 Permissions & Privacy

WebAble values user privacy and operates client-side wherever possible.

| Permission | Purpose |
| :--- | :--- |
| `storage` | Saves user preferences (font selections, speech rate, enabled visual modes) across sessions. |
| `scripting` | Applies accessibility CSS and scripts to the active web tab. |
| `tabs` | Identifies the active browser tab when the popup is opened. |
| `<all_urls>` | Enables accessibility enhancements and image captioning on any webpage the user visits. |

> 🛡️ **Privacy Guarantee**: WebAble does not track, collect, or store personal browsing history. URLs of images are only sent to the Hugging Face Inference API when the user explicitly triggers the **AI Image Descriptions** feature.

---

## 💡 Keyboard Shortcuts & Quick Tips

- **Close Focus Mode**: Press `Escape` or click the dimmed overlay outside the content box.
- **Text-to-Speech**: Highlight any passage before pressing **Read Highlighted Text**; playback starts with automatic word-level highlighting.
- **OpenDyslexic Font**: To render the official OpenDyslexic typeface, ensure the font is installed on your operating system or select **Comic Sans MS** for an immediate dyslexia-friendly alternative.

---

## 🤝 Contributing

Contributions, feedback, and feature requests are welcome!

1. **Fork** the repository
2. **Create your Feature Branch**:
   ```bash
   git checkout -b feature/AmazingAccessibilityFeature
   ```
3. **Commit your Changes**:
   ```bash
   git commit -m "Add AmazingAccessibilityFeature"
   ```
4. **Push to the Branch**:
   ```bash
   git push origin feature/AmazingAccessibilityFeature
   ```
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - feel free to use, modify, and distribute it to make the web a more accessible place.
