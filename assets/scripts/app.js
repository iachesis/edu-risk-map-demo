"use strict";

// for debudding -> delete from production
const log = console.log;

// constants in one place
const opacities = {
  "Непереборний": 1,
  "Дуже високий": 0.8,
  "Високий": 0.6,
  "Помірний": 0.4,
  "Задовільний": 0.2,
};

const pallete = {
  "Непереборний": "#004BC1",
  "Дуже високий": "#004BC1",
  "Високий": "#004BC1",
  "Помірний": "#004BC1",
  "Задовільний": "#004BC1",
};

var searchMap = {};

onload = async () => {
  loadAssets().then(({ adm1, adm3, data }) => {
    //style ADM3 level geo features
    const style_adm3 = (feature) => {
      return {
        fill: true,
        fillColor:
          feature.properties.id == "3200000"
            ? "grey"
            : pallete[data[feature.properties.id].risk],
        fillOpacity:
          feature.properties.id == "3200000"
            ? 1
            : opacities[data[feature.properties.id].risk],
        stroke: true,
        weight: 0.5,
        opacity: 1,
        color: "#F5F7FA",
      };
    };

    // style ADM1 level geo features
    const style_adm1 = () => {
      return {
        fill: false,
        stroke: true,
        color: "white",
        weight: 1,
        opacity: 1,
      };
    };

    // handle mouse events on geo geatures
    const handler = (feature, layer) => {
      if (feature.properties.id != "3200000") {
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
              event.target
                .setStyle({
                  fillOpacity: opacities[data[feature.properties.id].risk],
                  fillColor: pallete[data[feature.properties.id].risk],
                })
                .bringToBack();
              info.update();
            },
          })
          .bindTooltip(data[feature.properties.id].name);
          searchMap[data[feature.properties.id].code] = layer;
      }
    };

    // create geo layers
    const adm1_layer = L.geoJSON(adm1, { style: style_adm1 });
    const adm3_layer = L.geoJSON(adm3, {
      style: style_adm3,
      onEachFeature: handler,
    });

    // get geojson bounds and map center
    const bounds = adm3_layer.getBounds().pad(0.05);
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
      for (const [risk, opacity] of Object.entries(opacities))
        div.innerHTML += `<div>
        <span data-o="${opacity}"></span>
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
      threshold: 0.3,
      location: 0,
      distance: 100,
      includeScore: true,
      shouldSort: true,
      keys: ['code', 'name'],
    }

    const db = Object.values(data);
    const index = Fuse.createIndex(options.keys, db)
    const fuse = new Fuse(db, options, index);

    document.querySelector("#search").oninput = () => {
      adm3_layer.resetStyle();
      if (document.querySelector("#search").value) {
        const search = fuse.search(document.querySelector("#search").value, {
          limit: 5,
        });
        log(search);
        for (const result in search) {
          searchMap[search[result].item.code].setStyle({
            fillColor: "red",
            fillOpacity: 1 - 2 * search[result].score,
          })
        }
      }
    };

  })
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
