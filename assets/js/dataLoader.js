const fetchCache = new Map();
const failedFetchCache = new Map();

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 300;
const CACHE_PREFIX = "fetchCache:";
// Use a monotonically increasing date stamp so we can bump cache validity to a
// specific deployment or data refresh date (YYYY-MM-DD). This gives us a
// human-readable invalidation signal that is more informative than opaque
// version counters and safer than relying on implicit storage expiry.
const CACHE_VERSION_DATE = "2025-09-05";
const CACHE_VERSION_MS = Date.parse(CACHE_VERSION_DATE);

let cacheVersionEnsured = false;

const ensureCacheVersion = () => {
  if (cacheVersionEnsured) {
    return;
  }

  cacheVersionEnsured = true;

  try {
    const storedVersion = localStorage.getItem(`${CACHE_PREFIX}version`);
    const storedVersionMs = storedVersion ? Number.parseInt(storedVersion, 10) : NaN;

    if (Number.isNaN(CACHE_VERSION_MS)) {
      throw new Error(`Invalid CACHE_VERSION_DATE: ${CACHE_VERSION_DATE}`);
    }

    if (storedVersionMs !== CACHE_VERSION_MS) {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }

      localStorage.setItem(`${CACHE_PREFIX}version`, `${CACHE_VERSION_MS}`);
    }
  } catch (error) {
    console.warn("Persistent cache unavailable, continuing without it", error);
  }
};

const getPersistentCacheKey = (url) => `${CACHE_PREFIX}${CACHE_VERSION_MS}:${url}`;

const loadFromPersistentCache = (url) => {
  try {
    ensureCacheVersion();
    const cachedValue = localStorage.getItem(getPersistentCacheKey(url));

    if (!cachedValue) {
      return null;
    }

    const parsedValue = JSON.parse(cachedValue);
    fetchCache.set(url, parsedValue);
    console.debug(`Serving ${url} from persistent cache`);
    return parsedValue;
  } catch (error) {
    console.warn(`Failed to read cached response for ${url}`, error);
    return null;
  }
};

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

  const persistedResponse = loadFromPersistentCache(url);

  if (persistedResponse) {
    return persistedResponse;
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
      try {
        ensureCacheVersion();
        localStorage.setItem(
          getPersistentCacheKey(url),
          JSON.stringify(json)
        );
      } catch (error) {
        console.warn(`Failed to persist cached response for ${url}`, error);
      }
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

const logPhaseFailure = (phase, error) => {
  console.error(`[${phase}] ${error.message}`, error);
};

export const loadAssets = async () => {
  try {
    const data = await fetchJson("assets/data/data.json");

    const loadGeometry = (url, label) =>
      fetchJson(url).catch((error) => {
        logPhaseFailure(label, error);
        throw error;
      });

    return {
      data,
      geometries: {
        adm1: loadGeometry("assets/data/adm1.json", "geometries:adm1"),
        adm3: loadGeometry("assets/data/adm3.json", "geometries:adm3"),
      },
    };
  } catch (error) {
    logPhaseFailure("attributes", error);
    throw error;
  }
};
