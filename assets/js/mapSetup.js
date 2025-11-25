export const createMapWithLayers = (adm3Layer, adm1Layer) => {
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

  return map;
};
