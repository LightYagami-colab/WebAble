importScripts('config.js');

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['settings.js']
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'WEBABLE_CAPTION_URLS') {
    captionUrls(msg.urls).then(sendResponse).catch(e => {
      console.error(e);
      sendResponse({ ok: false, error: String(e) });
    });
    return true;
  }

  if (msg?.type === 'WEBABLE_GET_SETTINGS') {
    chrome.storage.sync.get(['isDyslexiaModeActive', 'isContrastModeActive', 'selectedFont'], (result) => {
      sendResponse(result);
    });
    return true;
  }
});

async function captionUrls(urls) {
  const results = [];

  for (const url of urls) {
    try {
      console.log(`Processing: ${url}`);
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning',
        {
          headers: {
            Authorization: 'Bearer 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'
          },
          method: 'POST',
          body: JSON.stringify({ inputs: url }),
        }
      );

      const result = await response.json();
      console.log(`API Result:`, result);

      // Handle the response correctly
      let caption = 'Unable to generate description';

      if (Array.isArray(result) && result.length > 0) {
        caption = result[0]?.generated_text || 'Image';
      } else if (result.generated_text) {
        caption = result.generated_text;
      } else if (result.error) {
        console.error(`API Error: ${result.error}`);
        caption = generateFallbackDescription(url);
      } else if (typeof result === 'string') {
        caption = result;
      } else {
        caption = generateFallbackDescription(url);
      }

      results.push({ url, caption });
      console.log(`Caption: ${caption}`);

    } catch (e) {
      console.error(`Failed: ${url}`, e);
      const fallback = generateFallbackDescription(url);
      results.push({ url, caption: fallback });
    }
  }

  return { ok: true, results };
}

function generateFallbackDescription(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const filename = pathname.split('/').pop().replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    
    // Smart categorization
    if (pathname.includes('avatar')) return 'Profile picture or avatar';
    if (pathname.includes('profile')) return 'Profile image';
    if (pathname.includes('logo')) return 'Logo or brand icon';
    if (pathname.includes('icon')) return 'Icon or symbol';
    if (pathname.includes('banner')) return 'Banner image';
    if (pathname.includes('header')) return 'Header image';
    
    return filename.length > 2 ? `Image: ${filename}` : 'Image file';
  } catch {
    return 'Image';
  }
}
