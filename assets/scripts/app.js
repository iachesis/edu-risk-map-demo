"use strict";

/**
 * Ordered palette describing how each risk level should be rendered.
 * The array preserves the legend order while `RISK_STYLE_MAP` offers
 * quick lookup for styling functions and hover interactions.
 */
const RISK_LEVELS = [
  { level: "Непереборний", color: "#004BC1", opacity: 1 },
  { level: "Дуже високий", color: "#004BC1", opacity: 0.8 },
  { level: "Високий", color: "#004BC1", opacity: 0.6 },
  { level: "Помірний", color: "#004BC1", opacity: 0.4 },
  { level: "Задовільний", color: "#004BC1", opacity: 0.2 },
];

const RISK_STYLE_MAP = Object.fromEntries(
  RISK_LEVELS.map(({ level, ...style }) => [level, style])
);

const DEFAULT_RISK_LEVEL = RISK_LEVELS.at(-1).level;
const CHORNOBYL_ZONE_ID = "3200000";
const SEARCH_LIMIT = 5;

const searchMap = {};
let currentSearch = [];
let searchOpacities = [];

const fetchCache = new Map();

const showLoading = () => {
  const loadingElement = document.querySelector("#loading");
  loadingElement?.classList.remove("hidden");
};

const hideLoading = () => {
  const loadingElement = document.querySelector("#loading");
  loadingElement?.classList.add("hidden");
};

const resetError = () => {
  const errorElement = document.querySelector("#error-message");
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.classList.add("hidden");
  }
};

const showError = (message) => {
  const errorElement = document.querySelector("#error-message");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
  }
};

const getRiskStyle = (risk) =>
  RISK_STYLE_MAP[risk] ?? RISK_STYLE_MAP[DEFAULT_RISK_LEVEL];

onload = async () => {
  showLoading();
  resetError();
  try {
    const assets = await loadAssets();
    initializeMap(assets);
  } catch (error) {
    showError("Не вдалося завантажити дані. Будь ласка, спробуйте пізніше.");
    console.error(error);
  } finally {
    hideLoading();
  }
};

const initializeMap = ({ adm1, adm3, data }) => {
  const getFeatureData = (id) => data?.[id] ?? null;

  const styleAdm3 = (feature) => {
    const featureData = getFeatureData(feature.properties.id);
    const riskStyle = getRiskStyle(featureData?.risk);

    const isChornobyl = feature.properties.id === CHORNOBYL_ZONE_ID;

    return {
      fill: true,
      fillColor: isChornobyl ? "grey" : riskStyle.color,
      fillOpacity: isChornobyl ? 1 : riskStyle.opacity,
      stroke: true,
      weight: 0.5,
      opacity: 1,
      color: "#F5F7FA",
    };
  };

  const styleAdm1 = () => ({
    fill: false,
    stroke: true,
    weight: 1,
    opacity: 1,
    color: "#FFE358",
  });

  const info = L.control({ position: "topleft" });
  info.onAdd = function () {
    this._div = L.DomUtil.create("div", "info control");
    this.update();
    return this._div;
  };
  info.update = function (props) {
    if (!props) {
      this._div.innerHTML = "<h2>Рівень ризику громади</h2>Наведіть на громаду";
      return;
    }

    const featureData = getFeatureData(props.id);
    if (featureData) {
      this._div.innerHTML = `<h2>Рівень ризику громади</h2>
        <b>${featureData.name}</b>
        <br />
        ${featureData.region}
        <br />
        КАТОТТГ: ${featureData.code}
        <br /><br />
        Ризик: <b>${featureData.risk}</b>`;
      return;
    }

    this._div.innerHTML =
      "<h2>Рівень ризику громади</h2>Дані тимчасово недоступні";
  };

  const handler = (feature, layer) => {
    const featureData = getFeatureData(feature.properties.id);

    if (feature.properties.id === CHORNOBYL_ZONE_ID) {
      layer.bindTooltip("Чорнобильська зона відчуження");
      return;
    }

    const tooltipText = featureData?.name ?? "Дані тимчасово недоступні";

    layer
      .on({
        mouseover: (event) => {
          event.target
            .setStyle({
              fillOpacity: 1,
              fillColor: "#FFE358",
            })
            .bringToFront();
          info.update(feature.properties);
        },
        mouseout: (event) => {
          const searchIndex = featureData
            ? currentSearch.indexOf(featureData.code)
            : -1;
          const isSearchResult = searchIndex !== -1;
          const riskStyle = getRiskStyle(featureData?.risk);
          event.target
            .setStyle({
              fillOpacity: isSearchResult
                ? searchOpacities[searchIndex] ?? riskStyle.opacity
                : riskStyle.opacity,
              fillColor: isSearchResult ? "red" : riskStyle.color,
            })
            .bringToBack();
          info.update();
        },
      })
      .bindTooltip(tooltipText);

    if (featureData?.code) {
      searchMap[featureData.code] = layer;
    }
  };

  const adm1Layer = L.geoJSON(adm1, { style: styleAdm1 });
  const adm3Layer = L.geoJSON(adm3, {
    style: styleAdm3,
    onEachFeature: handler,
  });

  const bounds = adm3Layer.getBounds().pad(0.5);
  const center = bounds.getCenter();

  const map = L.map("map", {
    attributionControl: false,
    zoomControl: false,
    center,
    zoomDelta: 0.5,
    zoomSnap: 0.5,
    zoom: 6.5,
    minZoom: 6.5,
    maxZoom: 15,
    boxZoom: false,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    layers: [adm3Layer, adm1Layer],
  });

  map.on("movestart", () => {
    map.eachLayer((layer) => layer.closeTooltip());
  });

  map.on("zoomstart", () => {
    map.eachLayer((layer) => layer.closeTooltip());
  });

  const attribution = L.control.attribution({
    prefix: false,
    position: "bottomright",
  });

  attribution.addAttribution(
    '&copy; <a href="https://etheric.dev/" target="_blank" rel="noopener noreferrer">etheric.dev<a>'
  );

  attribution.addTo(map);

  const zoom = L.control.zoom({
    position: "bottomright",
  });

  zoom.addTo(map);

  const legend = L.control({ position: "bottomleft" });
  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "legend control");
    div.innerHTML += "<h2>Рівні ризику</h2>";
    for (const { level, opacity } of RISK_LEVELS)
      div.innerHTML += `<div>
        <span data-o="${opacity}"></span>
        <span>${level}</span>
      </div>`;
    return div;
  };
  legend.addTo(map);

  info.addTo(map);

  const desc = L.control({ position: "topright" });

  desc.onAdd = () => {
    const div = L.DomUtil.create("div", "desc control");
    div.innerHTML = `
      <h2>Ризики безпеки</h2>
      <p>Ризики безпеки в освіті та їх рівні визначені
      <a href="https://zakon.rada.gov.ua/laws/show/866-2024-%D0%BF" target="_blank" rel="noopener noreferrer">Методикою</a>,
      затвердженою Урядом. За результатом розрахунків за Методикою Міністерство освіти і науки (МОН) видало
      <a href="https://zakon.rada.gov.ua/laws/show/z1339-24" target="_blank" rel="noopener noreferrer">наказ</a> і навело
      <a href="https://zakon.rada.gov.ua/laws/show/z1339-24#n14" target="_blank" rel="noopener noreferrer">перелік</a> громад
      з їх рівнями безпеки в освіті. Відповідно до завдань Уряду МОН оновлює перелік щоквартально.</p>
      <p>Ви також можете переглянути
      <a href="https://youtube.com/playlist?list=PLFVSJgZgf7h8hnkKGUnNML29ak7Lglw-_" target="_blank" rel="noopener noreferrer">плейлист</a>
      з відео поясненнями рівнів ризику на офіційному каналі МОН в YouTube.</p>`;
    map.desc = this;
    return div;
  };

  desc.onRemove = () => {
    delete map.desc;
  };

  document.querySelector("#help").onclick = () => {
    map.desc ? desc.remove() : desc.addTo(map);
  };

  const searchOptions = {
    threshold: 0.2,
    location: 0,
    distance: 25,
    includeScore: true,
    findAllMatches: true,
    keys: ["code", "name"],
  };

  const searchData = Object.values(data).filter(
    (entry) => entry && entry.code && entry.name
  );
  const searchIndex = Fuse.createIndex(searchOptions.keys, searchData);
  const fuse = new Fuse(searchData, searchOptions, searchIndex);

  const searchInput = document.querySelector("#search");

  const handleSearchInput = () => {
    adm3Layer.resetStyle();
    currentSearch = [];
    searchOpacities = [];

    const query = searchInput.value.trim();
    if (query.length <= 2) {
      return;
    }

    const results = fuse.search(query, { limit: SEARCH_LIMIT });
    const resultLayers = [];
    results.forEach((result, index) => {
      const { item } = result;
      const layer = searchMap[item.code];
      if (!layer) {
        return;
      }

      const opacity = 1 - index / SEARCH_LIMIT;
      layer.setStyle({
        fillColor: "red",
        fillOpacity: opacity,
      });
      currentSearch.push(item.code);
      searchOpacities.push(opacity);
      resultLayers.push(layer);
    });

    if (resultLayers.length > 0) {
      map.flyToBounds(L.featureGroup(resultLayers).getBounds().pad(0.5), {
        duration: 0.5,
      });
    }
  };

  searchInput.oninput = handleSearchInput;
};

const loadAssets = async () => {
  const [adm1, adm3, data] = await Promise.all([
    fetchJson("assets/data/adm1.json"),
    fetchJson("assets/data/adm3.json"),
    fetchJson("assets/data/data.json"),
  ]);

  return { adm1, adm3, data };
};

const fetchJson = async (url) => {
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
