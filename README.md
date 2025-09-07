# Can I Wash Tomorrow SPA

A mobile-friendly React + Vite single-page app for Berlin's weather and solar forecast, ready for GitHub Pages deployment.

## Features
- Fetches weather forecast for Berlin from Open-Meteo API
- Displays temperature, weather code (with icons/tooltips), sunshine hours, sunrise/sunset
- Highlights current date row
- Two toggles: show/hide estimated solar power, show/hide sunrise/sunset (states saved in localStorage)
- Estimated solar power production (based on historical data and sunshine hours, with monthly adjustment)
- Line chart for estimated power and historical production (Recharts)
- Responsive, plain CSS (no Tailwind)

## Project Structure
- `src/App.jsx`: Main app logic
- `src/components/Card.jsx`, `CardContent.jsx`: Card UI components
- `src/index.css`: Styles for cards, tables, toggles, etc.
- `.devcontainer/devcontainer.json`: Node dev container
- `.github/workflows/deploy.yml`: GitHub Pages auto-deploy
- `vite.config.js`, `index.html`, `package.json`: Vite/React setup
- `enrich_solar_data.js`: Enriches your CSV production data with sunshine hours and kWh per sunshine hour (writes `output.json` and `output.csv`)

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
# Produces output.json and output.csv for use in the app
```

## API & Libraries
- **Weather API:** [Open-Meteo](https://open-meteo.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Recharts](https://recharts.org/)

## License
MIT (see LICENSE)
