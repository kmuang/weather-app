import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const WMO_CODES = {
  0: { label: 'Clear Sky', icon: '☀️', bg: 'clear' },
  1: { label: 'Mainly Clear', icon: '🌤️', bg: 'clear' },
  2: { label: 'Partly Cloudy', icon: '⛅', bg: 'cloudy' },
  3: { label: 'Overcast', icon: '☁️', bg: 'cloudy' },
  45: { label: 'Foggy', icon: '🌫️', bg: 'fog' },
  48: { label: 'Icy Fog', icon: '🌫️', bg: 'fog' },
  51: { label: 'Light Drizzle', icon: '🌦️', bg: 'rain' },
  53: { label: 'Drizzle', icon: '🌦️', bg: 'rain' },
  55: { label: 'Heavy Drizzle', icon: '🌧️', bg: 'rain' },
  61: { label: 'Light Rain', icon: '🌧️', bg: 'rain' },
  63: { label: 'Rain', icon: '🌧️', bg: 'rain' },
  65: { label: 'Heavy Rain', icon: '🌧️', bg: 'rain' },
  71: { label: 'Light Snow', icon: '🌨️', bg: 'snow' },
  73: { label: 'Snow', icon: '❄️', bg: 'snow' },
  75: { label: 'Heavy Snow', icon: '❄️', bg: 'snow' },
  77: { label: 'Snow Grains', icon: '🌨️', bg: 'snow' },
  80: { label: 'Light Showers', icon: '🌦️', bg: 'rain' },
  81: { label: 'Showers', icon: '🌧️', bg: 'rain' },
  82: { label: 'Heavy Showers', icon: '⛈️', bg: 'storm' },
  85: { label: 'Snow Showers', icon: '🌨️', bg: 'snow' },
  86: { label: 'Heavy Snow Showers', icon: '❄️', bg: 'snow' },
  95: { label: 'Thunderstorm', icon: '⛈️', bg: 'storm' },
  96: { label: 'Thunderstorm w/ Hail', icon: '⛈️', bg: 'storm' },
  99: { label: 'Thunderstorm w/ Heavy Hail', icon: '⛈️', bg: 'storm' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getWeatherInfo(code) {
  return WMO_CODES[code] || { label: 'Unknown', icon: '🌡️', bg: 'clear' };
}

function formatTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  return h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
}

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return DAYS[d.getDay()];
}

function formatFullDate() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getWindDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function UVIndex({ value }) {
  const level = value <= 2 ? { label: 'Low', color: '#4ade80' }
    : value <= 5 ? { label: 'Moderate', color: '#fbbf24' }
    : value <= 7 ? { label: 'High', color: '#f97316' }
    : value <= 10 ? { label: 'Very High', color: '#ef4444' }
    : { label: 'Extreme', color: '#a855f7' };
  return (
    <div className="uv-bar-wrap">
      <div className="uv-bar">
        <div className="uv-fill" style={{ width: `${Math.min(value / 11 * 100, 100)}%`, background: level.color }} />
      </div>
      <span style={{ color: level.color }}>{level.label}</span>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('C');
  const [activeTab, setActiveTab] = useState('hourly');
  const [searchFocused, setSearchFocused] = useState(false);

  const toF = (c) => Math.round(c * 9 / 5 + 32);
  const temp = (c) => unit === 'C' ? `${Math.round(c)}°` : `${toF(c)}°`;

  const fetchWeather = useCallback(async (lat, lon, name, country) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,` +
        `surface_pressure,wind_speed_10m,wind_direction_10m,uv_index,visibility` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,uv_index_max` +
        `&timezone=auto&forecast_days=7`
      );
      const data = await res.json();
      setWeather(data);
      setLocation({ name, country, lat, lon });
    } catch {
      setError('Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCities = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6`);
      const data = await res.json();
      setSuggestions(data.results || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCities(query), 300);
    return () => clearTimeout(t);
  }, [query, searchCities]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          fetch(`https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${coords.latitude}&longitude=${coords.longitude}`)
            .catch(() => {});
          fetchWeather(coords.latitude, coords.longitude, 'Current Location', '');
        },
        () => fetchWeather(40.7128, -74.006, 'New York', 'US')
      );
    } else {
      fetchWeather(40.7128, -74.006, 'New York', 'US');
    }
  }, [fetchWeather]);

  const selectCity = (city) => {
    setQuery('');
    setSuggestions([]);
    setSearchFocused(false);
    fetchWeather(city.latitude, city.longitude, city.name, city.country_code || '');
  };

  const bgClass = weather ? getWeatherInfo(weather.current.weather_code).bg : 'clear';
  const isDay = weather
    ? (() => {
        const now = new Date();
        const sunrise = new Date(weather.daily.sunrise[0]);
        const sunset = new Date(weather.daily.sunset[0]);
        return now >= sunrise && now <= sunset;
      })()
    : true;

  const nowHourIndex = weather
    ? weather.hourly.time.findIndex(t => new Date(t) >= new Date()) - 1
    : 0;
  const hourlySlice = weather ? weather.hourly.time.slice(nowHourIndex, nowHourIndex + 24) : [];

  return (
    <div className={`app bg-${bgClass} ${isDay ? 'day' : 'night'}`}>
      <div className="particles">
        {bgClass === 'rain' && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="raindrop" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${0.5 + Math.random()}s` }} />
        ))}
        {bgClass === 'snow' && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s` }}>❄</div>
        ))}
        {bgClass === 'storm' && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="lightning" style={{ animationDelay: `${i * 1.5}s` }} />
        ))}
      </div>

      <div className="container">
        {/* Search */}
        <div className={`search-wrap ${searchFocused ? 'focused' : ''}`}>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search city..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => { setSearchFocused(false); setSuggestions([]); }, 200)}
            />
            <button className={`unit-toggle ${unit === 'F' ? 'active' : ''}`} onClick={() => setUnit(u => u === 'C' ? 'F' : 'C')}>
              °{unit === 'C' ? 'F' : 'C'}
            </button>
          </div>
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map(c => (
                <li key={c.id} onMouseDown={() => selectCity(c)}>
                  <span className="city-name">{c.name}</span>
                  <span className="city-meta">{c.admin1 && `${c.admin1}, `}{c.country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {loading && (
          <div className="loader-wrap">
            <div className="loader" />
            <p>Loading weather...</p>
          </div>
        )}

        {error && <div className="error-card">{error}</div>}

        {weather && !loading && (
          <>
            {/* Hero Card */}
            <div className="hero-card glass">
              <div className="hero-top">
                <div className="location-info">
                  <h1 className="city">{location?.name}</h1>
                  {location?.country && <span className="country">{location.country}</span>}
                  <p className="date">{formatFullDate()}</p>
                </div>
                <div className="weather-icon-wrap">
                  <div className="weather-icon-big">
                    {getWeatherInfo(weather.current.weather_code).icon}
                  </div>
                </div>
              </div>

              <div className="temp-row">
                <div className="temp-main">{temp(weather.current.temperature_2m)}<span className="unit">{unit}</span></div>
                <div className="temp-details">
                  <div className="condition">{getWeatherInfo(weather.current.weather_code).label}</div>
                  <div className="feels-like">Feels like {temp(weather.current.apparent_temperature)}</div>
                  <div className="hi-lo">
                    <span>↑ {temp(weather.daily.temperature_2m_max[0])}</span>
                    <span>↓ {temp(weather.daily.temperature_2m_min[0])}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
              {[
                { icon: '💧', label: 'Humidity', value: `${weather.current.relative_humidity_2m}%` },
                { icon: '🌬️', label: 'Wind', value: `${Math.round(weather.current.wind_speed_10m)} km/h ${getWindDir(weather.current.wind_direction_10m)}` },
                { icon: '🔵', label: 'Pressure', value: `${Math.round(weather.current.surface_pressure)} hPa` },
                { icon: '👁️', label: 'Visibility', value: `${(weather.current.visibility / 1000).toFixed(1)} km` },
                { icon: '🌅', label: 'Sunrise', value: new Date(weather.daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                { icon: '🌇', label: 'Sunset', value: new Date(weather.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
              ].map(m => (
                <div key={m.label} className="metric-card glass">
                  <span className="metric-icon">{m.icon}</span>
                  <span className="metric-label">{m.label}</span>
                  <span className="metric-value">{m.value}</span>
                </div>
              ))}
            </div>

            {/* UV Index */}
            <div className="uv-card glass">
              <div className="uv-header">
                <span>☀️</span>
                <span>UV Index</span>
                <span className="uv-val">{Math.round(weather.current.uv_index)}</span>
              </div>
              <UVIndex value={weather.current.uv_index} />
            </div>

            {/* Tabs: Hourly / 7-Day */}
            <div className="forecast-card glass">
              <div className="tabs">
                <button className={activeTab === 'hourly' ? 'active' : ''} onClick={() => setActiveTab('hourly')}>Hourly</button>
                <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>7-Day</button>
              </div>

              {activeTab === 'hourly' && (
                <div className="hourly-scroll">
                  {hourlySlice.map((time, i) => {
                    const code = weather.hourly.weather_code[nowHourIndex + i];
                    const t = weather.hourly.temperature_2m[nowHourIndex + i];
                    const precip = weather.hourly.precipitation_probability[nowHourIndex + i];
                    return (
                      <div key={time} className={`hourly-item ${i === 0 ? 'now' : ''}`}>
                        <span className="h-time">{i === 0 ? 'Now' : formatTime(time)}</span>
                        <span className="h-icon">{getWeatherInfo(code).icon}</span>
                        <span className="h-temp">{temp(t)}</span>
                        {precip > 10 && <span className="h-precip">💧{precip}%</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'daily' && (
                <div className="daily-list">
                  {weather.daily.time.map((date, i) => {
                    const code = weather.daily.weather_code[i];
                    const max = weather.daily.temperature_2m_max[i];
                    const min = weather.daily.temperature_2m_min[i];
                    const precip = weather.daily.precipitation_sum[i];
                    return (
                      <div key={date} className={`daily-item ${i === 0 ? 'today' : ''}`}>
                        <span className="d-day">{i === 0 ? 'Today' : formatDay(date)}</span>
                        <span className="d-icon">{getWeatherInfo(code).icon}</span>
                        <span className="d-cond">{getWeatherInfo(code).label}</span>
                        {precip > 0 && <span className="d-precip">💧{precip.toFixed(1)}mm</span>}
                        <div className="d-temps">
                          <span className="d-max">{temp(max)}</span>
                          <span className="d-min">{temp(min)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <footer className="footer">Powered by Open-Meteo · {new Date().getFullYear()}</footer>
      </div>
    </div>
  );
}
