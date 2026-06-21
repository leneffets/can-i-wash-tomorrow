import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Card from './components/Card';
import CardContent from './components/CardContent';
import { Sun, CloudSun, CloudRain, Cloud, Zap, Wind, CloudDrizzle, CloudFog, CloudSnow, CloudHail } from 'lucide-react';
import {
  BarElement,
  BarController,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Chart, Line } from 'react-chartjs-2';

ChartJS.register(
  BarElement,
  BarController,
  CategoryScale,
  ChartTooltip,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
);

const WEATHER_CODES = {
  0: { icon: <Sun size={20} />, label: 'Clear sky' },
  1: { icon: <CloudSun size={20} />, label: 'Mainly clear' },
  2: { icon: <Cloud size={20} />, label: 'Partly cloudy' },
  3: { icon: <Cloud size={20} />, label: 'Overcast' },
  45: { icon: <CloudFog size={20} />, label: 'Fog' },
  48: { icon: <CloudFog size={20} />, label: 'Depositing rime fog' },
  51: { icon: <CloudDrizzle size={20} />, label: 'Light drizzle' },
  53: { icon: <CloudDrizzle size={20} />, label: 'Moderate drizzle' },
  55: { icon: <CloudDrizzle size={20} />, label: 'Dense drizzle' },
  56: { icon: <CloudDrizzle size={20} />, label: 'Light freezing drizzle' },
  57: { icon: <CloudDrizzle size={20} />, label: 'Dense freezing drizzle' },
  61: { icon: <CloudRain size={20} />, label: 'Slight rain' },
  63: { icon: <CloudRain size={20} />, label: 'Moderate rain' },
  65: { icon: <CloudRain size={20} />, label: 'Heavy rain' },
  66: { icon: <CloudRain size={20} />, label: 'Light freezing rain' },
  67: { icon: <CloudRain size={20} />, label: 'Heavy freezing rain' },
  71: { icon: <CloudSnow size={20} />, label: 'Slight snow fall' },
  73: { icon: <CloudSnow size={20} />, label: 'Moderate snow fall' },
  75: { icon: <CloudSnow size={20} />, label: 'Heavy snow fall' },
  77: { icon: <CloudHail size={20} />, label: 'Snow grains' },
  80: { icon: <CloudRain size={20} />, label: 'Slight rain showers' },
  81: { icon: <CloudRain size={20} />, label: 'Moderate rain showers' },
  82: { icon: <CloudRain size={20} />, label: 'Violent rain showers' },
  85: { icon: <CloudSnow size={20} />, label: 'Slight snow showers' },
  86: { icon: <CloudSnow size={20} />, label: 'Heavy snow showers' },
  95: { icon: <Zap size={20} />, label: 'Thunderstorm' },
  96: { icon: <Zap size={20} />, label: 'Thunderstorm with slight hail' },
  99: { icon: <Zap size={20} />, label: 'Thunderstorm with heavy hail' },
};

const COORDS = { lat: 52.51732000, lon: 13.58871000 };
// Historical production will be loaded from output.json

// Compute monthly averages for kWh per sunshine hour
function getMonthlyAverages(data) {
  const months = {};
  data.forEach(row => {
    const month = row.date.slice(5,7); // 'MM'
    if (!months[month]) months[month] = { sumHour: 0, countHour: 0, sumRad: 0, countRad: 0 };
    if (row.kWhPerHour) {
      months[month].sumHour += row.kWhPerHour;
      months[month].countHour++;
    }
    if (row.kWhPerRadiation) {
      months[month].sumRad += row.kWhPerRadiation;
      months[month].countRad++;
    }
  });
  const avg = {};
  Object.keys(months).forEach(m => {
    avg[m] = {
      kWhPerHour: months[m].countHour ? (months[m].sumHour / months[m].countHour) : null,
      kWhPerRadiation: months[m].countRad ? (months[m].sumRad / months[m].countRad) : null
    };
  });
  return avg;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function getWeekday(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}
function getNowString() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function getWeatherLabel(weathercode) {
  return WEATHER_CODES[weathercode]?.label || (weathercode === 0 ? 'Clear sky' : 'Unknown');
}

function createDotPattern(ctx, color = 'rgba(255, 152, 0, 0.35)') {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 8;
  patternCanvas.height = 8;
  const patternCtx = patternCanvas.getContext('2d');
  patternCtx.fillStyle = color;
  patternCtx.beginPath();
  patternCtx.arc(2, 2, 1.25, 0, Math.PI * 2);
  patternCtx.fill();
  return ctx.createPattern(patternCanvas, 'repeat');
}

function chartTextColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#666';
}

function chartGridColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--table-row-border').trim() || '#e3e3e3';
}

function baseChartOptions(yTitle, extraScales = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: chartTextColor(),
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const unit = context.dataset.unit ? ` ${context.dataset.unit}` : '';
            const value = typeof context.parsed.y === 'number' ? context.parsed.y.toFixed(2) : context.formattedValue;
            return `${context.dataset.label}: ${value}${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: chartTextColor(), maxRotation: 0 },
        grid: { color: chartGridColor() },
      },
      y: {
        title: { display: true, text: yTitle, color: chartTextColor() },
        ticks: { color: chartTextColor() },
        grid: { color: chartGridColor() },
        beginAtZero: true,
      },
      ...extraScales,
    },
  };
}

function hourlyChartOptions(weatherLabels = []) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend'],
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: chartTextColor(),
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const unit = context.dataset.unit ? ` ${context.dataset.unit}` : '';
            const value = typeof context.parsed.y === 'number' ? context.parsed.y.toFixed(2) : context.formattedValue;
            return `${context.dataset.label}: ${value}${unit}`;
          },
          afterBody(items) {
            const index = items[0]?.dataIndex;
            return typeof index === 'number' ? `Weather: ${weatherLabels[index] || 'Unknown'}` : '';
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartTextColor(),
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        grid: { display: false },
      },
      temp: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Temperature °C', color: chartTextColor() },
        ticks: { color: chartTextColor(), maxTicksLimit: 5 },
        grid: { color: chartGridColor(), drawTicks: false },
      },
      power: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Production kWh', color: chartTextColor() },
        ticks: { color: chartTextColor(), maxTicksLimit: 5 },
        grid: { drawOnChartArea: false },
        beginAtZero: true,
      },
      sun: {
        type: 'linear',
        display: false,
        min: 0,
        max: 1,
      },
    },
  };
}

function DailyForecastChart({ forecast }) {
  const data = useMemo(() => ({
    labels: forecast.map(day => formatDate(day.date)),
    datasets: [
      {
        label: 'Est. Power',
        unit: 'kWh',
        data: forecast.map(day => day.estimatedPower),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.16)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  }), [forecast]);

  return (
    <div className="chart-box">
      <Line data={data} options={baseChartOptions('kWh')} />
    </div>
  );
}

DailyForecastChart.propTypes = {
  forecast: PropTypes.arrayOf(PropTypes.object).isRequired,
};

function HistoricalChart({ historical }) {
  const data = useMemo(() => ({
    labels: historical.map(row => formatDate(row.date)),
    datasets: [
      {
        label: 'Historical',
        unit: 'kWh',
        data: historical.map(row => row.production),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        tension: 0.25,
        fill: true,
        pointRadius: 0,
      },
    ],
  }), [historical]);

  return (
    <div className="chart-box">
      <Line data={data} options={baseChartOptions('kWh')} />
    </div>
  );
}

HistoricalChart.propTypes = {
  historical: PropTypes.arrayOf(PropTypes.object).isRequired,
};

function HourlyChart({ date, hourlyEntry, isCurrentDay }) {
  const currentTime = useMemo(() => formatTime(new Date().toISOString()), []);
  const weatherLabels = useMemo(() => (
    hourlyEntry.hourly.weathercode?.map(getWeatherLabel) || []
  ), [hourlyEntry]);
  const data = useMemo(() => {
    const hourly = hourlyEntry.hourly;
    return {
      labels: hourly.time.map(formatTime),
      datasets: [
        {
          type: 'bar',
          label: 'Sunhours',
          unit: 'h',
          data: hourly.sunshine_duration.map(seconds => seconds / 3600),
          yAxisID: 'sun',
          backgroundColor: 'rgba(148, 163, 184, 0.16)',
          borderColor: 'rgba(148, 163, 184, 0)',
          borderWidth: 0,
          barPercentage: 1,
          categoryPercentage: 1,
          order: 10,
        },
        {
          type: 'line',
          label: 'Temperature',
          unit: '°C',
          data: hourly.temperature_2m,
          yAxisID: 'temp',
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          pointBackgroundColor: '#0284c7',
          pointBorderColor: '#0284c7',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 2,
          fill: false,
          order: 1,
        },
        {
          type: 'line',
          label: 'Expected production',
          unit: 'kWh',
          data: hourlyEntry.estimates,
          yAxisID: 'power',
          borderColor: '#f97316',
          borderDash: [4, 4],
          borderWidth: 2.5,
          backgroundColor(context) {
            const chart = context.chart;
            const { chartArea, ctx } = chart;
            if (!chartArea) return 'rgba(249, 115, 22, 0.12)';
            return createDotPattern(ctx, 'rgba(249, 115, 22, 0.28)');
          },
          tension: 0.35,
          pointRadius: 2.5,
          fill: true,
          order: 0,
        },
      ],
    };
  }, [hourlyEntry]);

  const nowPlugin = useMemo(() => ({
    id: `current-time-${date}`,
    afterDatasetsDraw(chart) {
      if (!isCurrentDay) return;
      const now = new Date();
      const currentHourIndex = hourlyEntry.hourly.time.findIndex(t => new Date(t).getHours() === now.getHours());
      if (currentHourIndex === -1) return;

      const xScale = chart.scales.x;
      const { top, bottom, right } = chart.chartArea;
      const currentX = xScale.getPixelForValue(currentHourIndex);
      const nextX = currentHourIndex < hourlyEntry.hourly.time.length - 1
        ? xScale.getPixelForValue(currentHourIndex + 1)
        : currentX;
      const x = currentX + ((nextX - currentX) * (now.getMinutes() / 60));
      const { ctx } = chart;

      ctx.save();
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.fillStyle = '#0f766e';
      ctx.textAlign = x > right - 36 ? 'right' : 'left';
      ctx.fillText('now', x > right - 36 ? x - 6 : x + 6, top + 14);
      ctx.restore();
    },
  }), [date, hourlyEntry, isCurrentDay]);

  const dismissTouchTooltipPlugin = useMemo(() => ({
    id: `dismiss-touch-tooltip-${date}`,
    afterEvent(chart, args) {
      if (args.event.type !== 'touchend') return;

      window.clearTimeout(chart.$touchTooltipTimeout);
      chart.$touchTooltipTimeout = window.setTimeout(() => {
        chart.setActiveElements([]);
        chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
        chart.update();
      }, 1800);
    },
  }), [date]);

  return (
    <>
      {isCurrentDay && <div className="current-time-hint">Current time: {currentTime}</div>}
      <div className="hourly-chart">
        <Chart
          type="bar"
          data={data}
          options={hourlyChartOptions(weatherLabels)}
          plugins={[nowPlugin, dismissTouchTooltipPlugin]}
        />
      </div>
    </>
  );
}

HourlyChart.propTypes = {
  date: PropTypes.string.isRequired,
  hourlyEntry: PropTypes.shape({
    estimates: PropTypes.arrayOf(PropTypes.number).isRequired,
    hourly: PropTypes.shape({
      sunshine_duration: PropTypes.arrayOf(PropTypes.number).isRequired,
      temperature_2m: PropTypes.arrayOf(PropTypes.number).isRequired,
      time: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
  }).isRequired,
  isCurrentDay: PropTypes.bool.isRequired,
};

function Toggle({ label, checked, onChange }) {
  return (
    <div className="toggle">
      <div
        className="toggle-switch"
        data-checked={checked}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
      >
        <div className="toggle-knob" />
      </div>
      <span>{label}</span>
    </div>
  );
}

Toggle.propTypes = {
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function App() {
  const [forecast, setForecast] = useState([]);
  const [showPower, setShowPower] = useState(() => localStorage.getItem('showPower') === 'true');
  const [showSun, setShowSun] = useState(() => localStorage.getItem('showSun') === 'true');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historical, setHistorical] = useState([]);
  const [monthlyPreset, setMonthlyPreset] = useState({});
  const [expandedDate, setExpandedDate] = useState(null);
  const [hourlyData, setHourlyData] = useState({});

  useEffect(() => {
    // Use Vite base URL for compatibility with GitHub Pages
    const base = import.meta.env.BASE_URL || '/';
    fetch(`${base}output_monthly.json`)
      .then(r => r.json())
      .then(data => {
        setMonthlyPreset(data);
      });
    fetch(`${base}output.json`)
      .then(r => r.json())
      .then(data => {
        setHistorical(data);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem('showPower', showPower);
  }, [showPower]);
  useEffect(() => {
    localStorage.setItem('showSun', showSun);
  }, [showSun]);

  useEffect(() => {
    setLoading(true);
    // Request daily shortwave_radiation_sum in addition to sunshine_duration so we can prefer radiation-based estimates
    // Get yesterday's date for the API request
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${COORDS.lat}&longitude=${COORDS.lon}&daily=temperature_2m_max,weathercode,sunshine_duration,shortwave_radiation_sum,sunrise,sunset&timezone=Europe%2FBerlin&past_days=1`)
      .then(r => r.json())
      .then(data => {
        // Use monthly averages for estimation
        const monthlyAvg = historical.length > 0 ? getMonthlyAverages(historical) : monthlyPreset;
        const days = data.daily.time.map((date, i) => {
          const sunshineHours = data.daily.sunshine_duration[i] / 3600;
          const forecastRadiation = data.daily.shortwave_radiation_sum ? data.daily.shortwave_radiation_sum[i] : null; // MJ/m2
          const month = date.slice(5,7);
          const monthObj = monthlyAvg[month] || {};
          let estimated = 0;
          // Prefer radiation-based estimate when forecast radiation and historical monthly factor exist
          if (forecastRadiation && monthObj.kWhPerRadiation) {
            estimated = forecastRadiation * monthObj.kWhPerRadiation;
          } else if (monthObj.kWhPerHour) {
            estimated = sunshineHours * monthObj.kWhPerHour;
          }
          return {
            date,
            temperature: data.daily.temperature_2m_max[i],
            weathercode: data.daily.weathercode[i],
            sunshine: sunshineHours,
            forecastRadiation,
            sunrise: data.daily.sunrise[i],
            sunset: data.daily.sunset[i],
            estimatedPower: estimated,
          };
        });
        setForecast(days);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch forecast');
        setLoading(false);
      });
  }, [historical, monthlyPreset]);

  const today = formatDate(new Date().toISOString());
  const visibleColumnCount = 4 + (showPower ? 1 : 0) + (showSun ? 2 : 0);

  return (
    <>
      <Card>
        <h2>Can I Wash Tomorrow</h2>
        <Toggle label="Show estimated power" checked={showPower} onChange={setShowPower} />
        <Toggle label="Show sunrise/sunset" checked={showSun} onChange={setShowSun} />
      </Card>
      <Card>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>{error}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Temp °C</th>
                  <th>Sunhours</th>
                  <th>Weather</th>
                  {showPower && <th>Estimated kWh</th>}
                  {showSun && <>
                    <th>Sunrise</th>
                    <th>Sunset</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {forecast.map(day => (
                  <React.Fragment key={day.date}>
                    <tr
                      className={expandedDate === day.date ? '' : (formatDate(day.date) === today ? 'highlight' : '')}
                      style={{ cursor: 'pointer' }}
                      onClick={async () => {
                        if (expandedDate === day.date) {
                          setExpandedDate(null);
                          return;
                        }
                        setExpandedDate(day.date);
                        if (!hourlyData[day.date]) {
                          // Request hourly shortwave_radiation (W/m²) in addition to sunshine_duration
                          const url = `https://api.open-meteo.com/v1/forecast?latitude=${COORDS.lat}&longitude=${COORDS.lon}&start_date=${day.date}&end_date=${day.date}&hourly=temperature_2m,weathercode,sunshine_duration,shortwave_radiation&timezone=Europe%2FBerlin`;
                          const res = await fetch(url);
                          const data = await res.json();
                          // Compute per-hour estimates using monthly medians (prefer radiation when available)
                          const monthlyAvg = historical.length > 0 ? getMonthlyAverages(historical) : monthlyPreset;
                          const month = day.date.slice(5,7);
                          const monthObj = monthlyAvg[month] || {};
                          const hourlyEstimates = data.hourly.time.map((t, i) => {
                            // shortwave_radiation is W/m2 (instantaneous hourly), convert to MJ/m2 per hour: W/m2 * 3600 s / 1e6 = MJ/m2
                            const sw = data.hourly.shortwave_radiation ? data.hourly.shortwave_radiation[i] : null;
                            const sw_MJ_per_m2 = (sw !== null && sw !== undefined) ? (sw * 3600 / 1e6) : null;
                            const sunshineHours = data.hourly.sunshine_duration ? (data.hourly.sunshine_duration[i] / 3600) : 0;
                            let est = 0;
                            if (sw_MJ_per_m2 !== null && monthObj.kWhPerRadiation) {
                              est = sw_MJ_per_m2 * monthObj.kWhPerRadiation;
                            } else if (monthObj.kWhPerHour) {
                              est = sunshineHours * monthObj.kWhPerHour;
                            } 
                            return est;
                          });

                          setHourlyData(prev => ({ ...prev, [day.date]: { hourly: data.hourly, estimates: hourlyEstimates } }));
                        }
                        // If today, scroll to current hour after expand
                        if (formatDate(day.date) === today) {
                          setTimeout(() => {
                            const now = new Date();
                            const hour = now.getHours();
                            const el = document.getElementById(`hour-row-${hour}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 300);
                        }
                      }}
                    >
                      <td>
                        <span style={{ textDecoration: 'none' }}>{getWeekday(day.date)}, {formatDate(day.date)}</span>
                      </td>
                      <td>{day.temperature}</td>
                      <td>{day.sunshine.toFixed(1)}</td>
                      <td>
                        <span className="tooltip">
                          {/* Always show sun icon for weathercode 0 (clear sky) */}
                          {WEATHER_CODES[day.weathercode]?.icon || (day.weathercode === 0 ? <Sun size={20} /> : <Wind size={20} />)}
                          <span className="tooltiptext">{WEATHER_CODES[day.weathercode]?.label || (day.weathercode === 0 ? 'Clear sky' : 'Unknown')}</span>
                        </span>
                      </td>
                      {showPower && <td>{day.estimatedPower.toFixed(2)}</td>}
                      {showSun && <>
                        <td>{formatTime(day.sunrise)}</td>
                        <td>{formatTime(day.sunset)}</td>
                      </>}
                    </tr>
                    {expandedDate === day.date && !hourlyData[day.date] && (
                      <tr>
                        <td colSpan={visibleColumnCount}>
                          Loading hourly forecast...
                        </td>
                      </tr>
                    )}
                    {expandedDate === day.date && hourlyData[day.date] && (
                      <tr className="hourly-chart-row">
                        <td colSpan={visibleColumnCount}>
                          <HourlyChart
                            date={day.date}
                            hourlyEntry={hourlyData[day.date]}
                            isCurrentDay={formatDate(day.date) === today}
                          />
                        </td>
                      </tr>
                    )}
                    {expandedDate === day.date && hourlyData[day.date] && (
                      hourlyData[day.date].hourly.time.map((t, i) => {
                        const now = new Date();
                        const currentHour = now.getHours();
                        const rowHour = new Date(t).getHours();
                        const isCurrentHour = expandedDate === day.date && formatDate(day.date) === today && rowHour === currentHour;
                        const temp = hourlyData[day.date].hourly.temperature_2m[i];
                        const sunshineHour = hourlyData[day.date].hourly.sunshine_duration ? (hourlyData[day.date].hourly.sunshine_duration[i] / 3600) : 0;
                        const weathercode = hourlyData[day.date].hourly.weathercode ? hourlyData[day.date].hourly.weathercode[i] : null;
                        const estimate = hourlyData[day.date].estimates ? hourlyData[day.date].estimates[i] : null;
                        return (
                          <tr
                            key={t}
                            id={isCurrentHour ? `hour-row-${rowHour}` : undefined}
                            className={isCurrentHour ? 'highlight' : ''}
                            style={{ background: 'var(--bg-secondary)' }}
                          >
                            <td>{formatTime(t)}</td>
                            <td>{temp}</td>
                            <td>{sunshineHour.toFixed(2)}</td>
                            <td>
                              <span className="tooltip">
                                {WEATHER_CODES[weathercode]?.icon || <Wind size={16} />}
                                <span className="tooltiptext">{WEATHER_CODES[weathercode]?.label || 'Unknown'}</span>
                              </span>
                            </td>
                            {showPower && <td>{estimate !== null && estimate !== undefined ? estimate.toFixed(3) : '-'}</td>}
                            {showSun && <>
                              <td>-</td>
                              <td>-</td>
                            </>}
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <h3>Estimated Solar Power Forecast</h3>
        <DailyForecastChart forecast={forecast} />
      </Card>
      <Card>
        <h3>Historical Solar Production</h3>
        <HistoricalChart historical={historical} />
      </Card>
      <div style={{ textAlign: 'right', fontSize: '0.95em', color: '#888', marginTop: '1rem' }}>
        Generated at {getNowString()}
      </div>
    </>
  );
}
