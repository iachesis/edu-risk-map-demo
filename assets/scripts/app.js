"use strict";

/**
 * Mapping between risk levels from the dataset and the fill styles applied on the map.
 * Each entry describes the color and opacity to use when rendering a community polygon
 * and feeds the legend control, keeping visual defaults consistent across interactions.
 */
const RISK_STYLES = {
  Непереборний: { color: "#004BC1", opacity: 1 },
  "Дуже високий": { color: "#004BC1", opacity: 0.8 },
  Високий: { color: "#004BC1", opacity: 0.6 },
  Помірний: { color: "#004BC1", opacity: 0.4 },
  Задовільний: { color: "#004BC1", opacity: 0.2 },
};

const chornobylZoneId = "3200000";

const searchLimit = 5;
const searchMap = {};
let currentSearch = [];
let searchOpacities = [];

onload = async () => {
  loadAssets().then(({ adm1, adm3, data }) => {
    /**
     * Styles ADM3 level GeoJSON features based on the risk level mapping.
     * Falls back to a neutral grey overlay for the Chornobyl exclusion zone.
     * @param {GeoJSON.Feature} feature - ADM3 feature with id and risk metadata.
     * @returns {L.PathOptions} Leaflet styling options for the feature.
     */
    const style_adm3 = (feature) => {
      const riskStyle =
        RISK_STYLES[data[feature.properties.id].risk] ?? RISK_STYLES.Помірний;
      return {
        fill: true,
        fillColor:
          feature.properties.id === chornobylZoneId
            ? "grey"
            : riskStyle.color,
        fillOpacity:
          feature.properties.id === chornobylZoneId ? 1 : riskStyle.opacity,
        stroke: true,
        weight: 0.5,
        opacity: 1,
        color: "#F5F7FA",
      };
    };

    /**
     * Styles ADM1 level GeoJSON features that provide the yellow outline.
     * @returns {L.PathOptions} Leaflet styling options for ADM1 borders.
     */
    const style_adm1 = () => {
      return {
        fill: false,
        stroke: true,
        weight: 1,
        opacity: 1,
        color: "#FFE358",
      };
    };

    /**
     * Attaches hover interactions to ADM3 features to highlight and reset styles.
     * Respects active search highlights by restoring prior search opacity and color.
     * @param {GeoJSON.Feature} feature - ADM3 feature providing identifiers.
     * @param {L.Layer} layer - Leaflet layer instance representing the feature.
     */
    const handler = (feature, layer) => {
      if (feature.properties.id !== chornobylZoneId) {
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
              const flag = currentSearch.includes(
                data[feature.properties.id].code
              );
              event.target
                .setStyle({
                  fillOpacity: flag
                    ? searchOpacities[
                        currentSearch.indexOf(data[feature.properties.id].code)
                      ]
                    : RISK_STYLES[data[feature.properties.id].risk].opacity,
                  fillColor: flag
                    ? "red"
                    : RISK_STYLES[data[feature.properties.id].risk].color,
                })
                .bringToBack();
              info.update();
            },
          })
          .bindTooltip(data[feature.properties.id].name);
        searchMap[data[feature.properties.id].code] = layer;
      } else {
        layer.bindTooltip("Чорнобильська зона відчуження");
      }
    };

    // create geo layers
    const adm1_layer = L.geoJSON(adm1, { style: style_adm1 });
    const adm3_layer = L.geoJSON(adm3, {
      style: style_adm3,
      onEachFeature: handler,
    });

    // get geojson bounds and map center
    const bounds = adm3_layer.getBounds().pad(0.5);
    const center = bounds.getCenter();

    // map initialization
    const map = L.map("map", {
      attributionControl: false,
      zoomControl: false,
      center: center,
      zoomDelta: 0.5,
      zoomSnap: 0.5,
      zoom: 6.5,
      minZoom: 6.5,
      maxZoom: 15,
      boxZoom: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      layers: [adm3_layer, adm1_layer],
    });

    map.on("movestart", () => {
      map.eachLayer((layer) => layer.closeTooltip());
    });

    map.on("zoomstart", () => {
      map.eachLayer((layer) => layer.closeTooltip());
    });

    // attributions control
    const attribution = L.control.attribution({
      prefix: false,
      position: "bottomright",
    });

    attribution.addAttribution(
      '&copy; <a href="https://etheric.dev/" target="_blank" rel="noopener noreferrer">etheric.dev<a>'
    );

    attribution.addTo(map);

    // zoom control
    const zoom = L.control.zoom({
      position: "bottomright",
    });

    zoom.addTo(map);

    // legend control
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend control");
      div.innerHTML += "<h2>Рівні ризику</h2>";
      for (const [risk, style] of Object.entries(RISK_STYLES))
        div.innerHTML += `<div>
        <span data-o="${style.opacity}"></span>
        <span>${risk}</span>
      </div>`;
      return div;
    };
    legend.addTo(map);

    // info control
    const info = L.control({ position: "topleft" });
    info.onAdd = function () {
      this._div = L.DomUtil.create("div", "info control");
      this.update();
      return this._div;
    };
    info.update = function (props) {
      this._div.innerHTML =
        props && props.id in data
          ? `<h2>Рівень ризику громади</h2>
          <b>${data[props.id].name}</b>
          <br />
          ${data[props.id].region}
          <br />
          КАТОТТГ: ${data[props.id].code}
          <br /> <br />
          Ризик: <b>${data[props.id].risk}</b>`
          : "<h2>Рівень ризику громади</h2>Наведіть на громаду";
    };
    info.addTo(map);

    // description control
    const desc = L.control({ position: "topright" });

    desc.onAdd = (map) => {
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

    // attach click event to help button
    document.querySelector("#help").onclick = () => {
      map.desc ? desc.remove() : desc.addTo(map);
    };

    // add search
    const options = {
      threshold: 0.2,
      location: 0,
      distance: 25,
      includeScore: true,
      findAllMatches: true,
      keys: ["code", "name"],
    };

    const db = Object.values(data);
    const index = Fuse.createIndex(options.keys, db);
    const fuse = new Fuse(db, options, index);

    /**
     * Handles fuzzy search input to highlight and zoom to matching communities.
     * Clears existing highlights when the query is too short (<= 2 characters).
     */
    const handleSearchInput = () => {
      //resets
      adm3_layer.resetStyle();
      currentSearch = [];
      searchOpacities = [];
      if (
        document.querySelector("#search").value &&
        document.querySelector("#search").value.length > 2
      ) {
        const search = fuse.search(document.querySelector("#search").value, {
          limit: searchLimit,
        });
        let searchResults = [];
        for (const result in search) {
          searchResults.push(searchMap[search[result].item.code]);
          searchResults[result].setStyle({
            fillColor: "red",
            fillOpacity: 1 - result / searchLimit,
          });
          currentSearch.push(search[result].item.code);
          searchOpacities.push(1 - result / searchLimit);
        }
        if (searchResults.length > 0) {
          map.flyToBounds(L.featureGroup(searchResults).getBounds().pad(0.5), {
            duration: 0.5,
          });
        }
      }
    };
    document.querySelector("#search").oninput = handleSearchInput;
  });
};

const loadAssets = async () => {
  return {
    adm1: await fetchJson("assets/data/adm1.json"),
    adm3: await fetchJson("assets/data/adm3.json"),
    data: await fetchJson("assets/data/data.json"),
  };
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  const json = await response.json();
  return json;
};
