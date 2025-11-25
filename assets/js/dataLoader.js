const fetchCache = new Map();
const failedFetchCache = new Map();

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 300;

const waitWithJitter = (attempt) =>
  new Promise((resolve) => {
    const jitter = Math.random() * BASE_RETRY_DELAY_MS;
    setTimeout(resolve, BASE_RETRY_DELAY_MS * attempt + jitter);
  });

export class FetchJsonError extends Error {
  constructor(type, { url, attempt, status, cause }) {
    let message;
    switch (type) {
      case "timeout":
        message = `Час очікування вичерпано для ${url}`;
        break;
      case "bad_response":
        message = `Некоректна відповідь від ${url}${
          status ? `: статус ${status}` : ""
        }`;
        break;
      default:
        message = `Не вдалося завантажити ${url}`;
    }

    super(message);
    this.name = "FetchJsonError";
    this.type = type;
    this.url = url;
    this.attempt = attempt;
    this.status = status;
    this.cause = cause;
  }
}

const fetchWithTimeout = async (url, attempt) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new FetchJsonError("bad_response", {
        url,
        attempt,
        status: response.status,
      });
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new FetchJsonError("timeout", { url, attempt, cause: error });
    }

    if (error instanceof FetchJsonError) {
      throw error;
    }

    throw new FetchJsonError("network", { url, attempt, cause: error });
  }
};

export const fetchJson = async (url) => {
  if (fetchCache.has(url)) {
    return fetchCache.get(url);
  }

  if (failedFetchCache.has(url)) {
    // Failed attempts are cached separately to avoid storing partial/invalid
    // responses in the main fetchCache. Subsequent calls can immediately surface
    // the prior structured error while still keeping successful responses clean.
    throw failedFetchCache.get(url);
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const json = await fetchWithTimeout(url, attempt);
      fetchCache.set(url, json);
      failedFetchCache.delete(url);
      return json;
    } catch (error) {
      lastError = error;
      console.warn(
        `Fetch attempt ${attempt}/${MAX_ATTEMPTS} failed for ${url}: ${error.message}`
      );

      if (attempt < MAX_ATTEMPTS) {
        await waitWithJitter(attempt);
      }
    }
  }

  failedFetchCache.set(url, lastError);
  throw lastError;
};

export const loadAssets = async () => {
  const [adm1, adm3, data] = await Promise.all([
    fetchJson("assets/data/adm1.json"),
    fetchJson("assets/data/adm3.json"),
    fetchJson("assets/data/data.json"),
  ]);

  return { adm1, adm3, data };
};
