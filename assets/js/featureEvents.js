import { CHORNOBYL_ZONE_ID } from "./constants.js";
import { getSearchHighlight, registerSearchLayer } from "./search.js";

export const createFeatureHandler = ({
  getFeatureData,
  getFeatureStyle,
  infoControl,
  searchState,
}) => {
  const handleMouseOver = (event) => {
    event.target
      .setStyle({
        fillOpacity: 1,
        fillColor: "#FFE358",
      })
      .bringToFront();
    infoControl.update(event.target.feature.properties);
  };

  const handleMouseOut = (featureData) => (event) => {
    const { isHighlighted, opacity } = getSearchHighlight(
      searchState,
      featureData?.code
    );
    const riskStyle = getFeatureStyle(featureData);
    event.target
      .setStyle({
        fillOpacity: isHighlighted ? opacity ?? riskStyle.opacity : riskStyle.opacity,
        fillColor: isHighlighted ? "red" : riskStyle.color,
      })
      .bringToBack();
    infoControl.update();
  };

  return (feature, layer) => {
    const featureData = getFeatureData(feature.properties.id);

    if (feature.properties.id === CHORNOBYL_ZONE_ID) {
      layer.bindTooltip("Чорнобильська зона відчуження");
      return;
    }

    const tooltipText = featureData?.name ?? "Дані тимчасово недоступні";

    layer
      .on({
        mouseover: handleMouseOver,
        mouseout: handleMouseOut(featureData),
      })
      .bindTooltip(tooltipText);

    if (featureData?.code) {
      registerSearchLayer(searchState, featureData.code, layer);
    }
  };
};
