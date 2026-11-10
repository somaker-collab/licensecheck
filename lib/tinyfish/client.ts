const API_KEY = process.env.TINYFISH_API_KEY;

export interface TinyFishMatch {
  name: string;
  status: string;
  original_status: string;
  registration_number?: string;
  source_url: string;
  expiry_date?: string;
  registration_date?: string;
  disciplinary_actions: string[];
  restrictions?: string[];
}

export interface TinyFishFetchPage { url: string; final_url?: string; text: string | null; }
export interface TinyFishFetchResponse { results: TinyFishFetchPage[]; errors: Array<{ url: string; error: string }>; }
export interface TinyFishRun {
  id?: string;
  run_id?: string;
  status: string;
  result?: { matches?: TinyFishMatch[] } | null;
  error?: { message?: string; category?: string } | null;
}

export const matchSchema = {
  type: 'object',
  properties: {
    matches: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, status: { type: 'string' }, original_status: { type: 'string' },
      registration_number: { type: 'string' }, source_url: { type: 'string' }, expiry_date: { type: 'string' },
      registration_date: { type: 'string' }, disciplinary_actions: { type: 'array', items: { type: 'string' } },
      restrictions: { type: 'array', items: { type: 'string' } },
    }, required: ['name', 'status', 'original_status', 'source_url', 'disciplinary_actions'] } },
  }, required: ['matches'],
};

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!API_KEY) throw new Error('TINYFISH_API_KEY is not configured on the server.');
  const headers = new Headers(init.headers);
  headers.set('X-API-Key', API_KEY);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...init, headers, cache: 'no-store' });
  const raw = await response.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { message: raw }; }
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message || body.message || `HTTP ${response.status}`;
    throw new Error(`TinyFish request failed: ${message}`);
  }
  return body as T;
}

export const TinyFishClient = {
  agent: async (prompt: string, startUrl: string) => {
    const { runId } = await TinyFishClient.startAgent(prompt, startUrl);
    let run = await TinyFishClient.getRun(runId);
    const deadline = Date.now() + 120000;
    while (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      run = await TinyFishClient.getRun(runId);
    }
    if (run.status !== 'COMPLETED') throw new Error(run.error?.message || `TinyFish Agent ended with status ${run.status}.`);
    return { data: { matches: run.result?.matches || [] } };
  },
  startAgent: async (prompt: string, startUrl: string) => {
    const response = await requestJson<{ run_id?: string; id?: string }>('https://agent.tinyfish.ai/v1/automation/run-async', {
      method: 'POST', body: JSON.stringify({ url: startUrl, goal: prompt, output_schema: matchSchema }),
    });
    const runId = response.run_id || response.id;
    if (!runId) throw new Error('TinyFish did not return a run_id.');
    return { runId };
  },
  getRun: (runId: string) => requestJson<TinyFishRun>(`https://agent.tinyfish.ai/v1/runs/${encodeURIComponent(runId)}`),
  fetch: (url: string, purpose: string) => requestJson<TinyFishFetchResponse>('https://api.fetch.tinyfish.ai', {
    method: 'POST', body: JSON.stringify({ urls: [url], purpose, format: 'markdown', ttl: 0 }),
  }),
  createMonitor: async (url: string, webhookUrl: string, frequency = 'daily') => {
    const response = await requestJson<{ monitor?: { id?: string; status?: string }; run?: { is_baseline?: boolean } }>('https://agent.tinyfish.ai/v1/monitors', {
      method: 'POST', body: JSON.stringify({ type: 'fetch', name: 'TinyVerify official registry record', config: { url, format: 'markdown', ttl: 0 }, schedule_cron: frequency === 'daily' ? '0 9 * * *' : frequency, purpose: 'Flag changes to licence, registration status, expiry, restrictions, or disciplinary information.', webhook_url: webhookUrl }),
    });
    if (!response.monitor?.id) throw new Error('TinyFish did not return a Monitor ID.');
    return { id: response.monitor.id, status: response.monitor.status || 'active', baselineCaptured: response.run?.is_baseline === true };
  },
};
