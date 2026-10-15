// service_worker.js - WebAble Background Service Worker
importScripts('config.js');

const captionCache = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'WEBABLE_CAPTION_URLS') {
    captionUrls(msg.urls || [])
      .then(sendResponse)
      .catch(e => {
        console.error('Captioning error:', e);
        sendResponse({ ok: false, error: String(e) });
      });
    return true; // Keep channel open for async response
  }

  if (msg?.type === 'WEBABLE_GET_SETTINGS') {
    chrome.storage.sync.get(
      ['isDyslexiaModeActive', 'isContrastModeActive', 'selectedFont', 'fontScale', 'ttsSpeed', 'hfApiKey'],
      (result) => {
        sendResponse(result || {});
      }
    );
    return true;
  }
});

async function captionUrls(urls) {
  const maxImages = WEBABLE_CONFIG.DEFAULT_MAX_IMAGES || 30;
  const targetUrls = urls.slice(0, maxImages);

  // Retrieve user custom API key if saved
  const storageData = await new Promise(resolve => {
    chrome.storage.sync.get(['hfApiKey'], resolve);
  });
  const apiKey = storageData?.hfApiKey?.trim() || null;

  // Process in concurrent pools
  const concurrency = WEBABLE_CONFIG.CONCURRENCY_LIMIT || 4;
  const results = [];

  for (let i = 0; i < targetUrls.length; i += concurrency) {
    const chunk = targetUrls.slice(i, i + concurrency);
    const chunkPromises = chunk.map(url => captionSingleImage(url, apiKey));
    const chunkResults = await Promise.allSettled(chunkPromises);

    for (let j = 0; j < chunk.length; j++) {
      const outcome = chunkResults[j];
      const url = chunk[j];
      if (outcome.status === 'fulfilled' && outcome.value) {
        results.push(outcome.value);
      } else {
        results.push({ url, caption: generateFallbackDescription(url) });
      }
    }
  }

  return { ok: true, results };
}

async function captionSingleImage(url, apiKey) {
  if (WEBABLE_CONFIG.CACHE_ENABLED && captionCache.has(url)) {
    return { url, caption: captionCache.get(url) };
  }

  const controller = new AbortController();
  const timeoutMs = WEBABLE_CONFIG.API_TIMEOUT || 10000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(WEBABLE_CONFIG.HF_MODEL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inputs: url }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`HF API responded with status ${response.status} for ${url}`);
      const fallback = generateFallbackDescription(url);
      if (WEBABLE_CONFIG.CACHE_ENABLED) captionCache.set(url, fallback);
      return { url, caption: fallback };
    }

    const result = await response.json();
    let caption = 'Image description';

    if (Array.isArray(result) && result.length > 0 && result[0]?.generated_text) {
      caption = result[0].generated_text;
    } else if (result?.generated_text) {
      caption = result.generated_text;
    } else if (typeof result === 'string') {
      caption = result;
    } else {
      caption = generateFallbackDescription(url);
    }

    // Capitalize first letter
    caption = caption.charAt(0).toUpperCase() + caption.slice(1);

    if (WEBABLE_CONFIG.CACHE_ENABLED) {
      captionCache.set(url, caption);
    }
    return { url, caption };
  } catch (err) {
    clearTimeout(timer);
    const fallback = generateFallbackDescription(url);
    if (WEBABLE_CONFIG.CACHE_ENABLED) captionCache.set(url, fallback);
    return { url, caption: fallback };
  }
}

function generateFallbackDescription(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const filename = pathname.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_+]/g, ' ') || '';

    // Smart contextual heuristics
    if (pathname.includes('avatar') || pathname.includes('user') || pathname.includes('author')) {
      return 'User profile picture or avatar';
    }
    if (pathname.includes('logo') || pathname.includes('brand')) {
      return 'Brand logo icon';
    }
    if (pathname.includes('banner') || pathname.includes('hero')) {
      return 'Promotional header banner';
    }
    if (pathname.includes('chart') || pathname.includes('graph')) {
      return 'Informational chart or diagram';
    }
    if (pathname.includes('product') || pathname.includes('item')) {
      return filename.length > 2 ? `Product image: ${filename}` : 'Product photograph';
    }
    if (filename.length > 2 && !/^\d+$/.test(filename)) {
      return `Image illustrating ${filename}`;
    }
    return 'Website illustration or photo';
  } catch {
    return 'Web image';
  }
}
