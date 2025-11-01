const fs = require('fs');
const https = require('https');
const path = require('path');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node enrich_solar_data.js input.csv');
  process.exit(1);
}

const COORDS = { lat: 52.51732000, lon: 13.58871000 };

// Fetch both sunshine duration and shortwave radiation (if available) for a date.
// Returns: { sunshineHours: number, radiation: number | null }
function fetchWeatherMetrics(date) {
  // Request both fields; some archive endpoints may not provide radiation for all datasets,
  // so radiation can be null and we gracefully fall back to sunshine-based logic.
  const url = `https://archive-api.open-meteo.com/v1/era5?latitude=${COORDS.lat}&longitude=${COORDS.lon}&start_date=${date}&end_date=${date}&daily=sunshine_duration,shortwave_radiation_sum&timezone=Europe%2FBerlin`;
  return new Promise((resolve) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const duration = json.daily?.sunshine_duration?.[0] || 0;
          // shortwave_radiation_sum is typically in MJ/m^2 for daily sums; treat missing as null
          const radiation = json.daily?.shortwave_radiation_sum?.[0] ?? null;
          resolve({ sunshineHours: duration / 3600, radiation });
        } catch {
          resolve({ sunshineHours: 0, radiation: null });
        }
      });
    }).on('error', () => resolve({ sunshineHours: 0, radiation: null }));
  });
}

async function enrichCSV() {
  const lines = fs.readFileSync(inputFile, 'utf8').split('\n');
  const header = 'Date,Production (kWh),Sunshine (h),Shortwave radiation (daily sum),kWh per sunshine hour,kWh per radiation';
  const out = [header];
  const jsonOut = [];
  const monthly = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const date = parts[1];
    const production = parseFloat(parts[2]);
    const metrics = await fetchWeatherMetrics(date);
    const sunshine = metrics.sunshineHours;
    const radiation = metrics.radiation; // may be null
    const kWhPerHour = sunshine ? (production / sunshine).toFixed(2) : '';
    const kWhPerRadiation = (radiation && radiation > 0) ? (production / radiation).toFixed(4) : '';
    out.push(`${date},${production},${sunshine.toFixed(2)},${radiation ?? ''},${kWhPerHour},${kWhPerRadiation}`);
    jsonOut.push({
      date,
      production,
      sunshine: parseFloat(sunshine.toFixed(2)),
      radiation: radiation !== null ? parseFloat(radiation) : null,
      kWhPerHour: kWhPerHour ? parseFloat(kWhPerHour) : null,
      kWhPerRadiation: kWhPerRadiation ? parseFloat(kWhPerRadiation) : null
    });
    // Monthly average calculation for both metrics (sunshine-based and radiation-based)
    const month = date.slice(5,7);
    if (!monthly[month]) monthly[month] = {
      sumPerHour: 0, countPerHour: 0,
      sumPerRadiation: 0, countPerRadiation: 0
    };
    if (kWhPerHour) {
      monthly[month].sumPerHour += parseFloat(kWhPerHour);
      monthly[month].countPerHour++;
    }
    if (kWhPerRadiation) {
      monthly[month].sumPerRadiation += parseFloat(kWhPerRadiation);
      monthly[month].countPerRadiation++;
    }
    console.log(`Processed ${date}: ${sunshine.toFixed(2)}h, ${kWhPerHour} kWh/h, ${kWhPerRadiation} kWh per MJ/m2`);
  }
  // Ensure public/ exists
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
  fs.writeFileSync(path.join(path.dirname(inputFile), 'output.csv'), out.join('\n'));
  fs.writeFileSync(path.join(publicDir, 'output.json'), JSON.stringify(jsonOut, null, 2));
  // Write monthly averages
  const monthlyAvg = {};
  Object.keys(monthly).forEach(m => {
    const mobj = monthly[m];
    monthlyAvg[m] = {
      kWhPerHour: mobj.countPerHour ? (mobj.sumPerHour / mobj.countPerHour) : null,
      kWhPerRadiation: mobj.countPerRadiation ? (mobj.sumPerRadiation / mobj.countPerRadiation) : null
    };
  });
  fs.writeFileSync(path.join(publicDir, 'output_monthly.json'), JSON.stringify(monthlyAvg, null, 2));
  console.log(`Enriched CSV written to output.csv`);
  console.log(`Enriched JSON written to public/output.json`);
  console.log(`Monthly averages written to public/output_monthly.json`);
}

enrichCSV();