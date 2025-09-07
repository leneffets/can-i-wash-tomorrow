const fs = require('fs');
const https = require('https');
const path = require('path');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node enrich_solar_data.js input.csv');
  process.exit(1);
}

const COORDS = { lat: 52.51732000, lon: 13.58871000 };

function fetchSunshine(date) {
  const url = `https://archive-api.open-meteo.com/v1/era5?latitude=${COORDS.lat}&longitude=${COORDS.lon}&start_date=${date}&end_date=${date}&daily=sunshine_duration&timezone=Europe%2FBerlin`;
  return new Promise((resolve) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const duration = json.daily?.sunshine_duration?.[0] || 0;
          resolve(duration / 3600); // hours
        } catch {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
}

async function enrichCSV() {
  const lines = fs.readFileSync(inputFile, 'utf8').split('\n');
  const header = 'Date,Production (kWh),Sunshine (h),kWh per sunshine hour';
  const out = [header];
  const jsonOut = [];
  const monthly = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const date = parts[1];
    const production = parseFloat(parts[2]);
    const sunshine = await fetchSunshine(date);
    const kWhPerHour = sunshine ? (production / sunshine).toFixed(2) : '';
    out.push(`${date},${production},${sunshine.toFixed(2)},${kWhPerHour}`);
    jsonOut.push({
      date,
      production,
      sunshine: parseFloat(sunshine.toFixed(2)),
      kWhPerHour: kWhPerHour ? parseFloat(kWhPerHour) : null
    });
    // Monthly average calculation
    const month = date.slice(5,7);
    if (!monthly[month]) monthly[month] = { sum: 0, count: 0 };
    if (kWhPerHour) {
      monthly[month].sum += parseFloat(kWhPerHour);
      monthly[month].count++;
    }
    console.log(`Processed ${date}: ${sunshine.toFixed(2)}h, ${kWhPerHour} kWh/h`);
  }
  // Ensure public/ exists
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
  fs.writeFileSync(path.join(path.dirname(inputFile), 'output.csv'), out.join('\n'));
  fs.writeFileSync(path.join(publicDir, 'output.json'), JSON.stringify(jsonOut, null, 2));
  // Write monthly averages
  const monthlyAvg = {};
  Object.keys(monthly).forEach(m => {
    monthlyAvg[m] = monthly[m].count ? (monthly[m].sum / monthly[m].count) : null;
  });
  fs.writeFileSync(path.join(publicDir, 'output_monthly.json'), JSON.stringify(monthlyAvg, null, 2));
  console.log(`Enriched CSV written to output.csv`);
  console.log(`Enriched JSON written to public/output.json`);
  console.log(`Monthly averages written to public/output_monthly.json`);
}

enrichCSV();