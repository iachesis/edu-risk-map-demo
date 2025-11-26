import { RISK_LEVELS } from "./constants.js";
import { createLegendControl } from "./layerStyling.js";

export const createInfoControl = (getFeatureData) => {
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

    const featureData = props?.id ? getFeatureData(props.id) : null;
    if (featureData) {
      this._div.innerHTML = `<h2>Рівень ризику громади</h2>
        <b>${featureData.name ?? "Невідома громада"}</b>
        <br />
        ${featureData.region ?? "Регіон невідомий"}
        <br />
        КАТОТТГ: ${featureData.code ?? "Н/Д"}
        <br /><br />
        Ризик: <b>${featureData.risk ?? RISK_LEVELS.at(-1).level}</b>`;
      return;
    }

    this._div.innerHTML =
      "<h2>Рівень ризику громади</h2>Дані тимчасово недоступні";
  };

  return info;
};

export const createDescriptionControl = () => {
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
    return div;
  };

  return desc;
};

export const attachHelpToggle = (map, descControl) => {
  const helpButton = document.querySelector("#help");
  if (!helpButton) {
    return;
  }

  let isVisible = false;

  const toggleDescription = () => {
    if (isVisible) {
      descControl.remove();
    } else {
      descControl.addTo(map);
    }
    isVisible = !isVisible;
  };

  helpButton.onclick = toggleDescription;
  toggleDescription();
};

export const addMapFurniture = (map, infoControl) => {
  const legend = createLegendControl();
  legend.addTo(map);

  infoControl.addTo(map);

  const desc = createDescriptionControl();
  attachHelpToggle(map, desc);

  const attribution = L.control.attribution({
    prefix: false,
    position: "bottomright",
  });

  attribution.addAttribution(
    '&copy; <a href="https://etheric.dev/" target="_blank" rel="noopener noreferrer">etheric.dev</a>'
  );

  attribution.addTo(map);

  const zoom = L.control.zoom({
    position: "bottomright",
  });

  zoom.addTo(map);
};
