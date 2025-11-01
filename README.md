# Can I Wash Tomorrow SPA

A mobile-friendly React + Vite single-page app for Berlin's weather and solar forecast, ready for GitHub Pages deployment.

## Features
- Fetches weather forecast for Berlin from Open-Meteo API
- Displays temperature, weather code (with icons/tooltips), sunshine hours, sunrise/sunset
- Highlights current date row
- Two toggles: show/hide estimated solar power, show/hide sunrise/sunset (states saved in localStorage)
- Smart solar power prediction using shortwave radiation and sunshine hours:
  - Daily and hourly production estimates based on historical patterns
  - Uses shortwave radiation (preferred) or sunshine hours with monthly adjustment
  - Click any day to see detailed hourly weather and power estimates
- Interactive features:
  - Expandable rows show hourly weather and estimated production
  - Current hour highlighted in hourly view
  - Automatic scrolling to current hour for today's expanded view
- Line chart for estimated power and historical production (Recharts)
- Responsive, plain CSS (no Tailwind)

## Project Structure
- `src/App.jsx`: Main app logic
- `src/components/Card.jsx`, `CardContent.jsx`: Card UI components
- `src/index.css`: Styles for cards, tables, toggles, etc.
- `.devcontainer/devcontainer.json`: Node dev container
- `.github/workflows/deploy.yml`: GitHub Pages auto-deploy
- `vite.config.js`, `index.html`, `package.json`: Vite/React setup
- `enrich_solar_data.js`: Enriches your CSV production data with sunshine hours and shortwave radiation, computing kWh-per-hour and kWh-per-radiation factors (writes `output.json`, `output.csv`, and monthly averages)

## Local Development
```bash
npm install
npm run dev
```

## Build & Deploy
```bash
npm run build
```

Push to `main` branch to auto-deploy via GitHub Actions.

## Data Enrichment
```bash
node enrich_solar_data.js input.csv
# Produces output.json (with radiation data), output.csv, and output_monthly.json (conversion factors)
```

## API & Libraries
- **Weather API:** [Open-Meteo](https://open-meteo.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Recharts](https://recharts.org/)

## License
MIT (see LICENSE)
