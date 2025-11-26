const DEFAULT_BOUNDS = L.latLngBounds(
  L.latLng(44, 22),
  L.latLng(52.5, 41)
);

export const createMapWithLayers = ({ layers, bounds }) => {
  const resolvedLayers = layers.filter(Boolean);

  const layerBounds = resolvedLayers
    .map((layer) => (typeof layer.getBounds === "function" ? layer.getBounds() : null))
    .filter((layerBound) => layerBound && layerBound.isValid())
    .reduce((aggregate, layerBound) => {
      if (!aggregate) {
        return layerBound;
      }

      return aggregate.extend(layerBound);
    }, null);

  const mapBounds = (bounds ?? layerBounds ?? DEFAULT_BOUNDS).pad(0.5);
  const center = mapBounds.getCenter();

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
    maxBounds: mapBounds,
    maxBoundsViscosity: 1.0,
    layers: resolvedLayers,
  });

  map.on("movestart", () => {
    map.eachLayer((layer) => layer.closeTooltip());
  });

  map.on("zoomstart", () => {
    map.eachLayer((layer) => layer.closeTooltip());
  });

  return map;
};
