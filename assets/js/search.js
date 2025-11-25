import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_HIGHLIGHT_LIMIT,
  SEARCH_RENDER_LIMIT,
} from "./constants.js";
import { debounce } from "./utils.js";

export const createSearchState = () => ({
  searchMap: {},
  currentSearch: [],
  searchOpacities: [],
  selectedResultCode: null,
  lastResults: [],
});

export const registerSearchLayer = (searchState, code, layer) => {
  if (code) {
    searchState.searchMap[code] = layer;
  }
};

export const getSearchHighlight = (searchState, code) => {
  const index = code ? searchState.currentSearch.indexOf(code) : -1;
  return {
    isHighlighted: index !== -1,
    opacity: index === -1 ? null : searchState.searchOpacities[index] ?? null,
  };
};

const createSearchIndex = (adm3, getFeatureData, missingSearchEntries) => {
  const searchOptions = {
    threshold: 0.2,
    location: 0,
    distance: 25,
    includeScore: true,
    findAllMatches: true,
    keys: ["code", "name"],
  };

  const searchData = adm3.features.reduce((list, feature) => {
    const entry = getFeatureData(feature.properties.id);
    if (!entry || !entry.code || !entry.name) {
      if (!missingSearchEntries.has(feature.properties.id)) {
        missingSearchEntries.add(feature.properties.id);
        console.warn(
          `Запис для пошуку з id ${feature.properties.id} відсутній або некоректний.`
        );
      }
      return list;
    }

    list.push(entry);
    return list;
  }, []);

  const searchIndex = Fuse.createIndex(searchOptions.keys, searchData);
  const fuse = new Fuse(searchData, searchOptions, searchIndex);

  console.info(
    `Всього записів пошуку: ${searchData.length}. Пропущено через відсутність даних: ${missingSearchEntries.size}.`
  );

  return fuse;
};

export const setupSearch = ({ adm3, getFeatureData, map, adm3Layer, searchState }) => {
  const missingSearchEntries = new Set();
  const fuse = createSearchIndex(adm3, getFeatureData, missingSearchEntries);

  const searchResults = document.querySelector("#search-results");
  const searchInput = document.querySelector("#search");

  const updateResultSelection = () => {
    if (!searchResults) {
      return;
    }

    const buttons = searchResults.querySelectorAll("button[data-code]");
    buttons.forEach((button) => {
      const isSelected = button.dataset.code === searchState.selectedResultCode;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-selected", isSelected);
    });
  };

  const flyToResult = (code) => {
    const layer = searchState.searchMap[code];
    if (!layer) {
      console.warn(`Шар для коду ${code} не знайдено.`);
      return;
    }

    map.flyToBounds(layer.getBounds().pad(0.5), {
      duration: 0.5,
    });
  };

  const setSelectedResult = (code, { fly = false, forceFly = false } = {}) => {
    const nextCode = code ?? null;
    const hasChanged = searchState.selectedResultCode !== nextCode;
    searchState.selectedResultCode = nextCode;
    updateResultSelection();

    if (fly && searchState.selectedResultCode && (hasChanged || forceFly)) {
      if (!searchState.searchMap[searchState.selectedResultCode]) {
        console.warn(
          `Неможливо виконати переліт: відсутній шар для ${searchState.selectedResultCode}.`
        );
        return;
      }
      flyToResult(searchState.selectedResultCode);
    }
  };

  const renderSearchResults = (results) => {
    if (!searchResults) {
      return;
    }

    searchResults.innerHTML = "";
    const limitedResults = results.slice(0, SEARCH_RENDER_LIMIT);

    if (limitedResults.length === 0) {
      searchResults.classList.add("hidden");
      updateResultSelection();
      return;
    }

    const fragment = document.createDocumentFragment();

    limitedResults.forEach((result) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.code = result.item.code;
      button.textContent = `${result.item.name} (${result.item.code})`;

      listItem.appendChild(button);
      fragment.appendChild(listItem);
    });

    searchResults.appendChild(fragment);
    searchResults.classList.remove("hidden");
    updateResultSelection();
  };

  const clearSearchResults = () => {
    searchState.lastResults = [];
    if (searchResults) {
      searchResults.innerHTML = "";
      searchResults.classList.add("hidden");
    }
    setSelectedResult(null);
  };

  const handleSearchInput = () => {
    adm3Layer.resetStyle();
    searchState.currentSearch = [];
    searchState.searchOpacities = [];

    const query = searchInput.value.trim();
    if (query === "" || query.length <= 2) {
      clearSearchResults();
      return;
    }

    const results = fuse.search(query, { limit: SEARCH_RENDER_LIMIT });
    searchState.lastResults = results;
    renderSearchResults(results);

    if (results.length === 0) {
      setSelectedResult(null);
      return;
    }

    results.slice(0, SEARCH_HIGHLIGHT_LIMIT).forEach((result, index) => {
      const { item } = result;
      const layer = searchState.searchMap[item.code];
      if (!layer) {
        console.warn(`Шар для результату пошуку з кодом ${item.code} відсутній.`);
        return;
      }

      const opacity = 1 - index / SEARCH_HIGHLIGHT_LIMIT;
      layer.setStyle({
        fillColor: "red",
        fillOpacity: opacity,
      });
      searchState.currentSearch.push(item.code);
      searchState.searchOpacities.push(opacity);
    });

    setSelectedResult(results[0]?.item.code, { fly: true });
  };

  const debouncedSearch = debounce(handleSearchInput, SEARCH_DEBOUNCE_MS);

  searchInput.addEventListener("input", debouncedSearch);

  searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      return;
    }
    debouncedSearch();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (searchState.lastResults.length === 0) {
      return;
    }

    setSelectedResult(searchState.lastResults[0]?.item.code, {
      fly: true,
      forceFly: true,
    });
  });

  searchResults?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-code]");
    if (!button) {
      return;
    }

    setSelectedResult(button.dataset.code, { fly: true, forceFly: true });
  });

  return missingSearchEntries;
};
