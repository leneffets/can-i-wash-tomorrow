import React, { useEffect, useState } from 'react';
import Card from './components/Card';
import CardContent from './components/CardContent';
import { Sun, Sunrise, Sunset, CloudSun, CloudRain, Cloud, Snowflake, Zap, Wind, CloudDrizzle, CloudFog, CloudLightning, CloudSnow, CloudHail } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

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
    if (!row.sunshine || !row.kWhPerHour) return;
    const month = row.date.slice(5,7); // 'MM'
    if (!months[month]) months[month] = { sum: 0, count: 0 };
    months[month].sum += row.kWhPerHour;
    months[month].count++;
  });
  const avg = {};
  Object.keys(months).forEach(m => {
    avg[m] = months[m].count ? months[m].sum / months[m].count : 0.7;
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
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${COORDS.lat}&longitude=${COORDS.lon}&daily=temperature_2m_max,weathercode,sunshine_duration,sunrise,sunset&timezone=Europe%2FBerlin`)
      .then(r => r.json())
      .then(data => {
        // Use monthly averages for estimation
        const monthlyAvg = historical.length > 0 ? getMonthlyAverages(historical) : monthlyPreset;
        const days = data.daily.time.map((date, i) => {
          const sunshineHours = data.daily.sunshine_duration[i] / 3600;
          const month = date.slice(5,7);
          const kWhPerHour = monthlyAvg[month] || 0.2;
          return {
            date,
            temperature: data.daily.temperature_2m_max[i],
            weathercode: data.daily.weathercode[i],
            sunshine: sunshineHours,
            sunrise: data.daily.sunrise[i],
            sunset: data.daily.sunset[i],
            estimatedPower: sunshineHours * kWhPerHour,
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
                          const base = import.meta.env.BASE_URL || '/';
                          const url = `https://api.open-meteo.com/v1/forecast?latitude=${COORDS.lat}&longitude=${COORDS.lon}&start_date=${day.date}&end_date=${day.date}&hourly=temperature_2m,weathercode,sunshine_duration&timezone=Europe%2FBerlin`;
                          const res = await fetch(url);
                          const data = await res.json();
                          setHourlyData(prev => ({ ...prev, [day.date]: data.hourly }));
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
                    {expandedDate === day.date && hourlyData[day.date] && (
                      hourlyData[day.date].time.map((t, i) => (
                        <tr key={t} className={(() => {
                          const now = new Date();
                          const currentHour = now.getHours();
                          const rowHour = new Date(t).getHours();
                          return (expandedDate === day.date && formatDate(day.date) === today && rowHour === currentHour) ? 'highlight' : '';
                        })()} style={{ background: '#f9f9f9' }}>
                            <td>{formatTime(t)}</td>
                            <td>{hourlyData[day.date].temperature_2m[i]}</td>
                            <td>{(hourlyData[day.date].sunshine_duration[i] / 3600).toFixed(2)}</td>
                            <td>
                              <span className="tooltip">
                                {WEATHER_CODES[hourlyData[day.date].weathercode[i]]?.icon || <Wind size={16} />}
                                <span className="tooltiptext">{WEATHER_CODES[hourlyData[day.date].weathercode[i]]?.label || 'Unknown'}</span>
                              </span>
                            </td>
                            {showPower && <td>-</td>}
                            {showSun && <>
                              <td>-</td>
                              <td>-</td>
                            </>}
                          </tr>
                      ))
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
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={forecast} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tickFormatter={formatDate} />
            <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={formatDate} formatter={v => v.toFixed(2)} />
            <CartesianGrid strokeDasharray="3 3" />
            <Line type="monotone" dataKey="estimatedPower" stroke="#ff9800" name="Est. Power" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3>Historical Solar Production</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={historical.map(row => ({ date: row.date, kWh: row.production }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tickFormatter={formatDate} />
            <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={formatDate} formatter={v => v.toFixed(2)} />
            <CartesianGrid strokeDasharray="3 3" />
            <Line type="monotone" dataKey="kWh" stroke="#2196f3" name="Historical" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <div style={{ textAlign: 'right', fontSize: '0.95em', color: '#888', marginTop: '1rem' }}>
        Generated at {getNowString()}
      </div>
    </>
  );
}
