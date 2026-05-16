const BASE_URL = "https://api.open.fec.gov";

export class FecApiError extends Error {
  constructor(message, { status, url, body }) {
    super(message);
    this.name = "FecApiError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FecClient {
  constructor({ apiKey, baseUrl = BASE_URL, delayMs = 150 } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.delayMs = delayMs;
    this.requestCount = 0;
  }

  buildUrl(path, params = {}) {
    const url = new URL(path, this.baseUrl);
    const search = new URLSearchParams();

    if (this.apiKey) {
      search.set("api_key", this.apiKey);
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          search.append(key, String(item));
        }
      } else {
        search.set(key, String(value));
      }
    }

    url.search = search.toString();
    return url;
  }

  async get(path, params = {}) {
    const url = this.buildUrl(path, params);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (this.delayMs) {
        await sleep(this.delayMs);
      }

      this.requestCount += 1;
      const response = await fetch(url);

      if (response.ok) {
        return response.json();
      }

      const body = await response.text();

      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await sleep(750 * attempt);
        continue;
      }

      throw new FecApiError(`FEC API request failed with ${response.status}`, {
        status: response.status,
        url: scrubApiKey(url),
        body,
      });
    }
  }

  async *paginate(path, params = {}) {
    let page = Number(params.page ?? 1);
    const perPage = Number(params.per_page ?? 100);

    while (true) {
      const payload = await this.get(path, {
        ...params,
        page,
        per_page: perPage,
      });

      const results = payload.results ?? [];
      yield {
        results,
        pagination: payload.pagination ?? {},
        path,
        page,
      };

      const pages = Number(payload.pagination?.pages ?? page);
      if (page >= pages || results.length === 0) {
        break;
      }

      page += 1;
    }
  }
}

export function scrubApiKey(url) {
  const clone = new URL(String(url));
  if (clone.searchParams.has("api_key")) {
    clone.searchParams.set("api_key", "[redacted]");
  }
  return clone.toString();
}
