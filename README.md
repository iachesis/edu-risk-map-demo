# Education risk map demo

An interactive, static Leaflet map that visualizes safety risk levels for Ukrainian territorial communities. The site runs entirely in the browser, pulling boundary GeoJSON and risk metadata from the `assets/data` folder, and highlights search results directly on the map.

## Overview

- Displays oblast and hromada boundaries with color-coded risk levels sourced from pre-generated JSON files.
- Provides a Ukrainian search experience for finding communities by name or КАТОТТГ code, with the top matches highlighted on the map.
- Shows contextual details via an information panel and hover/selection styles tailored for the data.

## Quick start

1. Ensure Python 3 is available for a simple static server.
2. From the repository root, run:
   ```bash
   python -m http.server 8000
   ```
3. Open [http://localhost:8000](http://localhost:8000) in your browser to explore the map.

Because the site is fully static, no additional build steps are required.

## Project structure

- `index.html` — Main page that wires together the map, loading state, and UI chrome.
- `assets/data/` — Pre-built JSON files:
  - `adm1.json`: oblast boundaries (Level 1 administrative units).
  - `adm3.json`: hromada boundaries with searchable names and КАТОТТГ identifiers.
  - `data.json`: risk-level metadata keyed by hromada.
- `assets/js/` — Vanilla JavaScript modules for map setup and entry (`mapSetup.js`, `main.js`), styling (`layerStyling.js`), data loading (`dataLoader.js`), search (`search.js`), controls (`controls.js`), feature interactions (`featureEvents.js`), shared constants, and UI helpers.
- `assets/styles/` — CSS for layout, typography, and Leaflet overrides.
- `assets/logos/` — Partner branding shown in the header.

## Development tips

- The app relies on Leaflet loaded from local scripts in `assets/scripts/`; keep those in sync if you upgrade Leaflet.
- Data fetching is optimized for static hosting. If you add new JSON assets, place them under `assets/data/` and adjust `dataLoader.js` accordingly.
- Maintain Ukrainian-facing copy for user-visible text, using English comments only for developer clarification.

## License

This project is available under the MIT License. See [LICENSE.md](LICENSE.md) for details.
