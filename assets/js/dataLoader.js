const fetchCache = new Map();

export const fetchJson = async (url) => {
  if (fetchCache.has(url)) {
    return fetchCache.get(url);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити ${url}: ${response.status}`);
  }

  const json = await response.json();
  fetchCache.set(url, json);
  return json;
};

export const loadAssets = async () => {
  const [adm1, adm3, data] = await Promise.all([
    fetchJson("assets/data/adm1.json"),
    fetchJson("assets/data/adm3.json"),
    fetchJson("assets/data/data.json"),
  ]);

  return { adm1, adm3, data };
};
