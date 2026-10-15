// Configuration for WebAble Extension
const WEBABLE_CONFIG = {
  DEFAULT_MAX_IMAGES: 30,
  API_TIMEOUT: 12000, // 12 seconds per image fetch
  CONCURRENCY_LIMIT: 4, // Max concurrent API requests
  CACHE_ENABLED: true,
  HF_MODEL_URL: 'https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WEBABLE_CONFIG;
}
