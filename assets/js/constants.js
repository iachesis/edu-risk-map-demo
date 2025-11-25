export const RISK_LEVELS = [
  { level: "Непереборний", color: "#004BC1", opacity: 1 },
  { level: "Дуже високий", color: "#004BC1", opacity: 0.8 },
  { level: "Високий", color: "#004BC1", opacity: 0.6 },
  { level: "Помірний", color: "#004BC1", opacity: 0.4 },
  { level: "Задовільний", color: "#004BC1", opacity: 0.2 },
];

export const RISK_STYLE_MAP = Object.fromEntries(
  RISK_LEVELS.map(({ level, ...style }) => [level, style])
);

export const DEFAULT_RISK_LEVEL = RISK_LEVELS.at(-1).level;
export const NEUTRAL_STYLE = { color: "#D7DCE0", opacity: 0.4 };
export const CHORNOBYL_ZONE_ID = "3200000";

export const SEARCH_HIGHLIGHT_LIMIT = 5;
export const SEARCH_RENDER_LIMIT = 10;
export const SEARCH_DEBOUNCE_MS = 250;
