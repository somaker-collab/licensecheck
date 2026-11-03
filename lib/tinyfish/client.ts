const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;
const BASE_URL = 'https://api.tinyfish.ai/v1'; // Standardized TinyFish API format

async function request(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TINYFISH_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`TinyFish API error: ${res.statusText}`);
  return res.json();
}

export const TinyFishClient = {
  agent: async (prompt: string, startUrl: string) => {
    return request('/agent', {
      method: 'POST',
      body: JSON.stringify({ prompt, start_url: startUrl, response_format: 'json' }),
    });
  },
  fetch: async (url: string, extractRules?: any) => {
    return request('/fetch', {
      method: 'POST',
      body: JSON.stringify({ url, extract_rules: extractRules }),
    });
  },
  createMonitor: async (url: string, webhookUrl: string, frequency: string = 'daily') => {
    return request('/monitors', {
      method: 'POST',
      body: JSON.stringify({ url, webhook_url: webhookUrl, frequency }),
    });
  },
  deleteMonitor: async (monitorId: string) => {
    return request(`/monitors/${monitorId}`, { method: 'DELETE' });
  }
};
