import { createFeatureHandler } from "./featureEvents.js";
import { addMapFurniture, createInfoControl } from "./controls.js";
import { loadAssets } from "./dataLoader.js";
import {
  createFeatureDataHelpers,
  createStyleFunctions,
} from "./layerStyling.js";
import { createMapWithLayers } from "./mapSetup.js";
import { createSearchState, setupSearch } from "./search.js";
import { hideLoading, resetError, showError, showLoading } from "./utils.js";

const initializeMap = ({ adm1, adm3, data }) => {
  const missingDataIds = new Set();

  const { getFeatureData } = createFeatureDataHelpers(data, missingDataIds);
  const { getFeatureStyle, styleAdm1, styleAdm3 } = createStyleFunctions(
    getFeatureData
  );
  const infoControl = createInfoControl(getFeatureData);
  const searchState = createSearchState();

  const featureHandler = createFeatureHandler({
    getFeatureData,
    getFeatureStyle,
    infoControl,
    searchState,
  });

  const adm1Layer = L.geoJSON(adm1, { style: styleAdm1 });
  const adm3Layer = L.geoJSON(adm3, {
    style: styleAdm3,
    onEachFeature: featureHandler,
  });

  const map = createMapWithLayers(adm3Layer, adm1Layer);

  addMapFurniture(map, infoControl);

  const missingSearchEntries = setupSearch({
    adm3,
    getFeatureData,
    map,
    adm3Layer,
    searchState,
  });

  if (missingDataIds.size > 0) {
    console.info(`Відсутні дані для ${missingDataIds.size} громад.`);
  }

  if (missingSearchEntries.size > 0) {
    console.info(
      `Відсутні або некоректні записи пошуку: ${missingSearchEntries.size}.`
    );
  }
};

const bootstrap = async () => {
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

window.addEventListener("load", bootstrap);
