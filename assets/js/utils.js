import { DEFAULT_RISK_LEVEL, RISK_STYLE_MAP } from "./constants.js";

export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const showLoading = () => {
  const loadingElement = document.querySelector("#loading");
  loadingElement?.classList.remove("hidden");
};

export const hideLoading = () => {
  const loadingElement = document.querySelector("#loading");
  loadingElement?.classList.add("hidden");
};

export const resetError = () => {
  const errorElement = document.querySelector("#error-message");
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.classList.add("hidden");
  }
};

export const showError = (message) => {
  const errorElement = document.querySelector("#error-message");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
  }
};

export const getRiskStyle = (risk) =>
  RISK_STYLE_MAP[risk] ?? RISK_STYLE_MAP[DEFAULT_RISK_LEVEL];
