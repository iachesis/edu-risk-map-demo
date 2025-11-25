import {
  CHORNOBYL_ZONE_ID,
  NEUTRAL_STYLE,
  RISK_LEVELS,
} from "./constants.js";
import { getRiskStyle } from "./utils.js";

export const createFeatureDataHelpers = (data, missingDataIds = new Set()) => {
  const getFeatureData = (id) => {
    if (!id || !data || !Object.hasOwn(data, id)) {
      if (id && !missingDataIds.has(id)) {
        missingDataIds.add(id);
        console.warn(`Дані для громади з id ${id} відсутні.`);
      }
      return null;
    }
    return data[id];
  };

  return { getFeatureData };
};

export const createStyleFunctions = (getFeatureData) => {
  const getFeatureStyle = (featureData) => {
    if (!featureData) {
      return NEUTRAL_STYLE;
    }

    return getRiskStyle(featureData.risk);
  };

  const styleAdm3 = (feature) => {
    const featureData = getFeatureData(feature.properties.id);
    const riskStyle = getFeatureStyle(featureData);

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

  return { getFeatureStyle, styleAdm1, styleAdm3 };
};

export const createLegendControl = () => {
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
  return legend;
};
