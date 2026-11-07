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

export interface TinyFishFetchPage {
  url: string;
  final_url: string;
  text: string | null;
}

export interface TinyFishFetchResponse {
  results: TinyFishFetchPage[];
  errors: Array<{ url: string; error: string }>;
}

export interface TinyFishSearchResponse {
  query: string;
  results: Array<{ url: string; title: string; site_name: string; snippet: string }>;
}

const matchSchema = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          status: { type: "string" },
          original_status: { type: "string" },
          registration_number: { type: "string" },
          source_url: { type: "string" },
          expiry_date: { type: "string" },
          registration_date: { type: "string" },
          disciplinary_actions: { type: "array", items: { type: "string" } },
          restrictions: { type: "array", items: { type: "string" } },
        },
        required: ["name", "status", "original_status", "source_url", "disciplinary_actions"],
      },
    },
  },
  required: ["matches"],
};

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!API_KEY) throw new Error("TINYFISH_API_KEY is not configured on the server.");

  const headers = new Headers(init.headers);
  headers.set("X-API-Key", API_KEY);
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...init, headers });
  const raw = await response.text();
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { message: raw };
  }

  if (!response.ok) {
    const errorBody = body as { message?: string; error?: string | { message?: string } };
    const message = typeof errorBody.error === "string"
      ? errorBody.error
      : errorBody.error?.message || errorBody.message || `HTTP ${response.status}`;
    throw new Error(`TinyFish request failed: ${message}`);
  }
  return body as T;
}

export const TinyFishClient = {
  // Keep the legacy { data: { matches } } shape so RegistryAdapter callers can be migrated safely.
  agent: async (prompt: string, startUrl: string) => {
    const run = await requestJson<{
      status: "COMPLETED" | "FAILED";
      result?: { matches?: TinyFishMatch[] } | null;
      error?: { message?: string } | null;
    }>("https://agent.tinyfish.ai/v1/automation/run", {
      method: "POST",
      body: JSON.stringify({ url: startUrl, goal: prompt, output_schema: matchSchema }),
    });

    if (run.status !== "COMPLETED") {
      throw new Error(run.error?.message || "TinyFish Agent did not complete the lookup.");
    }
    if (!Array.isArray(run.result?.matches)) {
      throw new Error("TinyFish Agent returned no structured matches array; result was not verified.");
    }
    return { data: { matches: run.result.matches } };
  },

  fetch: async (url: string, purpose = "Corroborate this exact record on the official registry page.") => {
    return requestJson<TinyFishFetchResponse>("https://api.fetch.tinyfish.ai", {
      method: "POST",
      body: JSON.stringify({ urls: [url], purpose, format: "markdown", ttl: 0 }),
    });
  },

  // Use this only from a real discovery path; a wrapper alone does not count as meaningful use.
  search: async (query: string, countryCode: string, language = "en") => {
    const url = new URL("https://api.search.tinyfish.ai" );
    url.searchParams.set("query", query);
    url.searchParams.set("location", countryCode.toUpperCase());
    url.searchParams.set("language", language);
    return requestJson<TinyFishSearchResponse>(url.toString(), { method: "GET" });
  },

  createMonitor: async (url: string, webhookUrl: string, frequency = "daily") => {
    const scheduleCron = frequency === "daily" ? "0 9 * * *" : frequency;
    const response = await requestJson<{
      monitor?: { id?: string; status?: string };
      run?: { is_baseline?: boolean };
    }>("https://agent.tinyfish.ai/v1/monitors", {
      method: "POST",
      body: JSON.stringify({
        type: "fetch",
        name: "LicenseCheck registry record",
        config: { url, format: "markdown" },
        schedule_cron: scheduleCron,
        purpose: "Detect changes that may affect this person's or company's official registration status.",
        webhook_url: webhookUrl,
      }),
    });

    if (!response.monitor?.id) throw new Error("TinyFish did not return a Monitor ID.");
    return {
      id: response.monitor.id,
      status: response.monitor.status || "active",
      baselineCaptured: response.run?.is_baseline === true,
    };
  },

  deleteMonitor: async (monitorId: string) => {
    return requestJson<{ deleted: boolean; id: string }>(
      `https://agent.tinyfish.ai/v1/monitors/${encodeURIComponent(monitorId)}`,
      { method: "DELETE" },
    );
  },
};
