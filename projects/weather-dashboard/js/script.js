(() => {
    'use strict';

    const API = {
        geo: 'https://geocoding-api.open-meteo.com/v1/search',
        weather: 'https://api.open-meteo.com/v1/forecast',
        airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality'
    };

    const CACHE_KEY = 'weather-dashboard-cache-v2';
    const FAVORITES_KEY = 'weather-dashboard-favs-v1';
    const UNITS_KEY = 'weather-dashboard-units-v1';

    const $ = id => document.getElementById(id);

    const dom = {
        body: document.body,
        input: $('searchInput'),
        search: $('searchBtn'),
        location: $('locationBtn'),
        dashboard: $('weatherDashboard'),
        empty: $('emptyState'),
        loading: $('loadingSpinner'),
        error: $('errorMessage'),
        forecast: $('forecastContainer'),
        theme: $('themeToggle'),
        unitToggle: $('unitToggle'),
        unitToggleLabel: $('unitToggleLabel'),
        quickCitiesList: $('quickCitiesList'),
        favoriteBtn: $('favoriteBtn'),
        mapSection: $('mapSection'),
        aqiSection: $('airQualitySection')
    };

    const PRESET_CITIES = [
        { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278, icon: '🏙️' },
        { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503, icon: '🗼' },
        { name: 'New York', country: 'US', lat: 40.7128, lon: -74.0060, icon: '🗽' },
        { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708, icon: '☀️' },
        { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522, icon: '🥐' }
    ];

    const conditions = {
        0: ['Clear', '☀️', 'sun'],
        1: ['Mainly clear', '🌤️', 'sun'],
        2: ['Partly cloudy', '⛅', 'clouds'],
        3: ['Overcast', '☁️', 'clouds'],
        45: ['Fog', '🌫️', 'fog'],
        48: ['Rime fog', '🌫️', 'fog'],
        51: ['Light drizzle', '🌦️', 'drizzle'],
        53: ['Drizzle', '🌦️', 'drizzle'],
        55: ['Heavy drizzle', '🌧️', 'rain'],
        61: ['Light rain', '🌦️', 'rain'],
        63: ['Rain', '🌧️', 'rain'],
        65: ['Heavy rain', '🌧️', 'rain'],
        71: ['Light snow', '❄️', 'snow'],
        73: ['Snow', '❄️', 'snow'],
        75: ['Heavy snow', '❄️', 'snow'],
        80: ['Rain showers', '🌦️', 'rain'],
        81: ['Heavy showers', '🌧️', 'rain'],
        82: ['Violent showers', '🌧️', 'rain'],
        95: ['Thunderstorm', '⛈️', 'thunder'],
        96: ['Thunderstorm with hail', '⛈️', 'thunder'],
        99: ['Severe thunderstorm', '⛈️', 'thunder']
    };

    let unitSystem = localStorage.getItem(UNITS_KEY) || 'metric'; // 'metric' (°C, km/h) or 'imperial' (°F, mph)
    let locationLocked = false;
    let mapLoading = false;
    let hourlyMode = true;
    let lastWeatherData = null;
    let lastAirData = null;
    let currentPlace = { city: '', country: '', lat: 0, lon: 0 };
    let activeRequest = null;

    // Unit conversion helpers
    const Units = {
        temp: c => unitSystem === 'imperial' ? (c * 9 / 5) + 32 : c,
        tempUnit: () => unitSystem === 'imperial' ? '°F' : '°C',
        wind: kmh => unitSystem === 'imperial' ? kmh * 0.621371 : kmh,
        windUnit: () => unitSystem === 'imperial' ? 'mph' : 'km/h',
        rain: mm => unitSystem === 'imperial' ? mm * 0.0393701 : mm,
        rainUnit: () => unitSystem === 'imperial' ? 'in/h' : 'mm/h',
        visibility: km => unitSystem === 'imperial' ? km * 0.621371 : km,
        visUnit: () => unitSystem === 'imperial' ? 'mi' : 'km',
        pressure: hpa => unitSystem === 'imperial' ? hpa * 0.02953 : hpa,
        pressUnit: () => unitSystem === 'imperial' ? 'inHg' : 'hPa'
    };

    function condition(code) {
        return conditions[code] || ['Unknown conditions', '🌤️', 'clouds'];
    }

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = value;
    }

    function animateNumber(id, target, formatter = value => String(Math.round(value))) {
        const element = $(id);
        const numericTarget = Number(target);

        if (!element || !Number.isFinite(numericTarget)) return;

        const start = Number(element.dataset.value || 0);
        element.dataset.value = String(numericTarget);

        // Fast-path: don't start animation frames if value is already target
        if (start === numericTarget) {
            element.textContent = formatter(numericTarget);
            return;
        }

        const isMobile = window.innerWidth <= 768;
        const duration = isMobile ? 240 : 450;
        const startTime = performance.now();

        function frame(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            element.textContent = formatter(
                start + (numericTarget - start) * eased
            );

            if (progress < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    function setLoading(value) {
        dom.loading.classList.toggle('hidden', !value);
    }

    function showError(message) {
        dom.error.textContent = message;
        dom.error.classList.add('show');
    }

    async function getJson(url, signal) {
        const response = await fetch(url, { signal });

        if (!response.ok) {
            throw new Error('Weather service is unavailable.');
        }

        return response.json();
    }

    function cacheKey(latitude, longitude) {
        return `${Number(latitude).toFixed(3)},${Number(longitude).toFixed(3)}`;
    }

    function readCache() {
        try {
            return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function writeCache(entry) {
        try {
            const cache = readCache().filter(item => item.key !== entry.key);

            cache.unshift({
                ...entry,
                savedAt: Date.now()
            });

            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify(cache.slice(0, 8))
            );
        } catch {
            // Local storage may be unavailable.
        }
    }

    function cachedWeather(latitude, longitude) {
        const item = readCache().find(entry =>
            entry.key === cacheKey(latitude, longitude)
        );

        return item && Date.now() - item.savedAt < 600000 ? item : null;
    }

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveFavorites(favs) {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
        } catch {
            // Local storage disabled
        }
        renderQuickCities();
        updateFavoriteButtonState();
    }

    function isCurrentCityFavorited() {
        const favs = getFavorites();
        return favs.some(f => 
            (f.name.toLowerCase() === currentPlace.city.toLowerCase()) ||
            (Math.abs(f.lat - currentPlace.lat) < 0.05 && Math.abs(f.lon - currentPlace.lon) < 0.05)
        );
    }

    function toggleFavorite() {
        if (!currentPlace.city) return;

        let favs = getFavorites();
        const existingIdx = favs.findIndex(f => 
            (f.name.toLowerCase() === currentPlace.city.toLowerCase()) ||
            (Math.abs(f.lat - currentPlace.lat) < 0.05 && Math.abs(f.lon - currentPlace.lon) < 0.05)
        );

        if (existingIdx >= 0) {
            favs.splice(existingIdx, 1);
        } else {
            favs.unshift({
                name: currentPlace.city,
                country: currentPlace.country,
                lat: currentPlace.lat,
                lon: currentPlace.lon
            });
            if (favs.length > 8) favs.pop();
        }

        saveFavorites(favs);
    }

    function updateFavoriteButtonState() {
        if (!dom.favoriteBtn) return;
        const favorited = isCurrentCityFavorited();
        dom.favoriteBtn.classList.toggle('is-pinned', favorited);
        const star = dom.favoriteBtn.querySelector('.star-icon');
        const label = dom.favoriteBtn.querySelector('.fav-label');
        if (star) star.textContent = favorited ? '★' : '☆';
        if (label) label.textContent = favorited ? 'Pinned' : 'Pin';
    }

    function renderQuickCities() {
        if (!dom.quickCitiesList) return;
        dom.quickCitiesList.replaceChildren();

        const userFavs = getFavorites();
        const citiesToShow = userFavs.length > 0 ? userFavs : PRESET_CITIES;

        citiesToShow.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-chip';
            if (userFavs.some(f => f.name.toLowerCase() === item.name.toLowerCase())) {
                btn.innerHTML = `<span class="chip-star">★</span> <span>${item.name}</span>`;
            } else {
                btn.innerHTML = `<span>${item.icon || '📍'}</span> <span>${item.name}</span>`;
            }

            if (currentPlace.city && item.name.toLowerCase() === currentPlace.city.toLowerCase()) {
                btn.classList.add('is-active');
            }

            btn.addEventListener('click', () => {
                if (item.lat && item.lon) {
                    loadWeather(item.lat, item.lon, item.name, item.country || '');
                } else {
                    searchCity(item.name);
                }
            });

            dom.quickCitiesList.appendChild(btn);
        });
    }

    function clock(value) {
        return new Date(value).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function periodFromTime(value) {
        const hour = Number(String(value).split('T')[1]?.slice(0, 2));

        if (!Number.isFinite(hour) || hour < 6 || hour >= 20) return 'night';
        if (hour < 10) return 'morning';
        if (hour < 16) return 'noon';

        return 'sunset';
    }

    function celestialState(code, clouds) {
        if (![0, 1].includes(Number(code))) return 'hidden';
        if (clouds <= 10) return 'full';
        if (clouds <= 35) return 'partial';

        return 'hidden';
    }

    function weatherIcon(scene) {
        const cloud =
            '<path class="cloud-shape" d="M25 55h68a16 16 0 0 0 2-32 27 27 0 0 0-51-5A20 20 0 0 0 25 55Z"/>';

        const icons = {
            sun: '<svg class="weather-svg" viewBox="0 0 100 100"><circle class="sun-core" cx="50" cy="50" r="22"/><g class="sun-rays"><path d="M50 8v15M50 77v15M8 50h15M77 50h15M20 20l11 11M69 69l11 11M80 20L69 31M31 69L20 80"/></g></svg>',
            clouds: `<svg class="weather-svg" viewBox="0 0 120 90">${cloud}</svg>`,
            rain: `<svg class="weather-svg" viewBox="0 0 120 100">${cloud}<path class="rain-drops" d="m38 68-6 18m26-18-6 18m26-18-6 18"/></svg>`,
            drizzle: `<svg class="weather-svg" viewBox="0 0 120 100">${cloud}<path class="rain-drops" d="m42 70-3 10m20-10-3 10m20-10-3 10"/></svg>`,
            thunder: `<svg class="weather-svg" viewBox="0 0 120 105">${cloud}<path class="bolt" d="M62 57 46 82h13l-5 18 21-29H62Z"/></svg>`,
            snow: `<svg class="weather-svg" viewBox="0 0 120 100">${cloud}<g class="snowflakes"><circle cx="40" cy="75" r="4"/><circle cx="60" cy="84" r="4"/><circle cx="80" cy="75" r="4"/></g></svg>`
        };

        return icons[scene] || icons.clouds;
    }

    function weatherVibe(temperature, wind, rain, scene) {
        if (scene === 'thunder') return 'Stormy skies and deep rumbles — stay cozy indoors.';

        if (rain > 0 || ['rain', 'drizzle'].includes(scene)) {
            return wind > 20
                ? 'Rain and a lively breeze — a dramatic day for staying in.'
                : 'A gentle rainy atmosphere — perfect for a quiet moment.';
        }

        if (scene === 'snow') {
            return 'Quiet snowy air and a crisp chill — a beautiful winter scene.';
        }

        if (temperature >= 24) {
            return wind > 18
                ? 'Bright skies with a refreshing breeze — ideal for getting outside.'
                : 'Mostly sunny and warm — perfect for a walk.';
        }

        if (temperature >= 15) {
            return wind > 20
                ? 'Comfortable air with a noticeable breeze — layers will help.'
                : 'Mild weather and calm air — a lovely time to explore.';
        }

        return 'Cool, calm air — a warm layer will make the day comfortable.';
    }

    function clothingSuggestion(temperature, rain, scene) {
        if (['rain', 'drizzle', 'thunder'].includes(scene) || rain > 0.2) {
            return temperature < 16
                ? 'Waterproof jacket and an umbrella recommended.'
                : 'Umbrella needed — choose water-resistant shoes.';
        }

        if (scene === 'snow' || temperature <= 5) {
            return 'Warm coat, gloves, and insulated footwear recommended.';
        }

        if (temperature <= 12) return 'Light jacket recommended.';
        if (temperature <= 18) return 'A light layer should feel comfortable.';
        if (temperature >= 28) {
            return 'Breathable clothing recommended — stay hydrated.';
        }

        return 'Comfortable everyday clothing should be perfect.';
    }

    function renderHourlyTimeline(hourly) {
        const timeline = $('hourlyTimeline');

        if (!timeline || !hourly?.time?.length) return;

        timeline.replaceChildren();

        hourly.time.slice(0, 24).forEach((time, index) => {
            const details = condition(hourly.weather_code[index]);
            const tempVal = Units.temp(hourly.temperature_2m[index]);
            const card = document.createElement('article');

            card.className = 'hour-card';
            card.innerHTML = `
                <time datetime="${time}">
                    ${new Date(time).toLocaleTimeString('en-US', {
                        hour: 'numeric'
                    })}
                </time>
                <div class="hour-icon" aria-label="${details[0]}">${details[1]}</div>
                <strong class="hour-temp">
                    ${Math.round(tempVal)}${Units.tempUnit()}
                </strong>
            `;

            timeline.appendChild(card);
        });
    }

    function renderWeatherTrends(hourly) {
        const wrapper = $('trendsGraphWrapper');
        if (!wrapper || !hourly?.time?.length) return;

        wrapper.replaceChildren();

        const count = Math.min(24, hourly.time.length);
        const times = hourly.time.slice(0, count);
        const temps = hourly.temperature_2m.slice(0, count).map(t => Units.temp(t));
        const rainAmounts = hourly.precipitation ? hourly.precipitation.slice(0, count) : [];
        const rainProbs = hourly.precipitation_probability ? hourly.precipitation_probability.slice(0, count) : [];

        const width = 860;
        const height = 240;
        const padding = { top: 42, right: 24, bottom: 38, left: 38 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const minTemp = Math.floor(Math.min(...temps)) - 2;
        const maxTemp = Math.ceil(Math.max(...temps)) + 3;
        const tempRange = Math.max(maxTemp - minTemp, 4);

        const maxRainProb = Math.max(100, ...rainProbs);

        const getX = i => padding.left + (i / (count - 1)) * chartW;
        const getYTemp = t => padding.top + chartH - ((t - minTemp) / tempRange) * chartH;
        const getYRainProb = p => padding.top + chartH - (p / maxRainProb) * (chartH * 0.85);

        // Tooltip container
        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        wrapper.appendChild(tooltip);

        function positionTooltip(targetEl) {
            const rectBox = wrapper.getBoundingClientRect();
            const eBox = targetEl.getBoundingClientRect();
            const targetCenterX = (eBox.left + eBox.width / 2) - rectBox.left + wrapper.scrollLeft;
            const targetTop = eBox.top - rectBox.top;

            // For peak temperature or rain near top, flip below target so it always fits in the card
            if (targetTop < 65) {
                tooltip.style.top = `${targetTop + eBox.height + 8}px`;
                tooltip.style.transform = 'translate(-50%, 0)';
            } else {
                tooltip.style.top = `${targetTop - 8}px`;
                tooltip.style.transform = 'translate(-50%, -100%)';
            }

            // Clamp horizontal position so tooltip stays within the visible card area on mobile
            const minX = wrapper.scrollLeft + 55;
            const maxX = wrapper.scrollLeft + rectBox.width - 55;
            const clampedX = Math.max(minX, Math.min(maxX, targetCenterX));
            tooltip.style.left = `${clampedX}px`;
            tooltip.style.opacity = '1';
        }

        function hideTooltip() {
            tooltip.style.opacity = '0';
        }

        // Build SVG
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('class', 'weather-trend-svg');

        // Defs for gradients
        const defs = document.createElementNS(svgNS, 'defs');
        defs.innerHTML = `
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffaa40" stop-opacity="0.38"/>
                <stop offset="100%" stop-color="#ff7043" stop-opacity="0.02"/>
            </linearGradient>
            <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.65"/>
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0.2"/>
            </linearGradient>
        `;
        svg.appendChild(defs);

        // Horizontal gridlines & Y-axis labels
        const gridSteps = 4;
        for (let s = 0; s <= gridSteps; s++) {
            const tempVal = minTemp + (tempRange * (s / gridSteps));
            const yPos = getYTemp(tempVal);

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', padding.left);
            line.setAttribute('x2', width - padding.right);
            line.setAttribute('y1', yPos);
            line.setAttribute('y2', yPos);
            line.setAttribute('class', 'grid-line');
            svg.appendChild(line);

            const yText = document.createElementNS(svgNS, 'text');
            yText.setAttribute('x', padding.left - 8);
            yText.setAttribute('y', yPos + 4);
            yText.setAttribute('text-anchor', 'end');
            yText.setAttribute('class', 'axis-text');
            yText.textContent = `${Math.round(tempVal)}°`;
            svg.appendChild(yText);
        }

        // Rain precipitation probability bars
        const barWidth = Math.max(6, (chartW / count) * 0.55);
        for (let i = 0; i < count; i++) {
            const prob = rainProbs[i] !== undefined ? rainProbs[i] : (rainAmounts[i] > 0 ? 60 : 0);
            const x = getX(i) - (barWidth / 2);
            const y = getYRainProb(prob);
            const barH = (padding.top + chartH) - y;

            if (prob > 0 && barH > 2) {
                const rect = document.createElementNS(svgNS, 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', barWidth);
                rect.setAttribute('height', barH);
                rect.setAttribute('rx', 3);
                rect.setAttribute('class', 'chart-bar');
                rect.setAttribute('fill', 'url(#rainGradient)');
                rect.setAttribute('opacity', '0.75');

                const timeStr = new Date(times[i]).toLocaleTimeString('en-US', { hour: 'numeric' });
                const rainAmt = rainAmounts[i] !== undefined ? `${Units.rain(rainAmounts[i]).toFixed(1)} ${Units.rainUnit()}` : '';

                const showRainDetails = (e) => {
                    if (e) e.stopPropagation();
                    tooltip.innerHTML = `<strong>${timeStr}</strong><br/>💧 Rain chance: ${prob}%${rainAmt ? `<br/>Rain: ${rainAmt}` : ''}`;
                    positionTooltip(rect);
                };

                rect.addEventListener('mouseenter', showRainDetails);
                rect.addEventListener('click', showRainDetails);
                rect.addEventListener('pointerdown', showRainDetails);
                rect.addEventListener('mouseleave', hideTooltip);

                svg.appendChild(rect);
            }
        }

        // Smooth area under temperature curve
        let areaPathD = `M ${getX(0)} ${getYTemp(temps[0])}`;
        for (let i = 0; i < count - 1; i++) {
            const x0 = getX(i);
            const y0 = getYTemp(temps[i]);
            const x1 = getX(i + 1);
            const y1 = getYTemp(temps[i + 1]);
            const mx = (x0 + x1) / 2;
            areaPathD += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
        }
        areaPathD += ` L ${getX(count - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`;

        const areaPath = document.createElementNS(svgNS, 'path');
        areaPath.setAttribute('d', areaPathD);
        areaPath.setAttribute('fill', 'url(#tempGradient)');
        svg.appendChild(areaPath);

        // Smooth temperature line
        let linePathD = `M ${getX(0)} ${getYTemp(temps[0])}`;
        for (let i = 0; i < count - 1; i++) {
            const x0 = getX(i);
            const y0 = getYTemp(temps[i]);
            const x1 = getX(i + 1);
            const y1 = getYTemp(temps[i + 1]);
            const mx = (x0 + x1) / 2;
            linePathD += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
        }

        const linePath = document.createElementNS(svgNS, 'path');
        linePath.setAttribute('d', linePathD);
        linePath.setAttribute('fill', 'none');
        linePath.setAttribute('stroke', '#ffaa40');
        linePath.setAttribute('stroke-width', '3');
        linePath.setAttribute('stroke-linecap', 'round');
        linePath.setAttribute('style', 'filter: drop-shadow(0 2px 8px rgba(255, 170, 64, 0.45));');
        svg.appendChild(linePath);

        // Interactive points on temperature line
        for (let i = 0; i < count; i++) {
            const x = getX(i);
            const y = getYTemp(temps[i]);

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '4.5');
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', '#ff7043');
            circle.setAttribute('stroke-width', '2.5');
            circle.setAttribute('class', 'chart-point');

            const timeStr = new Date(times[i]).toLocaleTimeString('en-US', { hour: 'numeric' });
            const tempVal = Math.round(temps[i]);
            const prob = rainProbs[i] !== undefined ? `${rainProbs[i]}%` : '0%';

            const showTempDetails = (e) => {
                if (e) e.stopPropagation();
                tooltip.innerHTML = `<strong>${timeStr}</strong><br/>🌡️ Temp: <strong>${tempVal}${Units.tempUnit()}</strong><br/>💧 Rain: ${prob}`;
                positionTooltip(circle);
            };

            circle.addEventListener('mouseenter', showTempDetails);
            circle.addEventListener('click', showTempDetails);
            circle.addEventListener('pointerdown', showTempDetails);
            circle.addEventListener('mouseleave', hideTooltip);

            svg.appendChild(circle);

            // Time labels on X-axis (every 3 hours or key intervals)
            if (i % 3 === 0 || i === count - 1) {
                const xText = document.createElementNS(svgNS, 'text');
                xText.setAttribute('x', x);
                xText.setAttribute('y', height - 12);
                xText.setAttribute('text-anchor', 'middle');
                xText.setAttribute('class', 'axis-text');
                xText.textContent = timeStr;
                svg.appendChild(xText);
            }
        }

        // Dismiss tooltip on outside click
        wrapper.addEventListener('click', (e) => {
            if (!e.target.closest('.chart-point') && !e.target.closest('.chart-bar')) {
                hideTooltip();
            }
        });

        wrapper.appendChild(svg);
    }

    function updateHourlyVisibility() {
        const timeline = $('hourlyTimeline');
        const toggle = $('hourlyToggle');

        if (!timeline || !toggle) return;

        hourlyMode = toggle.checked;
        timeline.classList.toggle('hidden', !hourlyMode);

        if (hourlyMode && lastWeatherData?.hourly) {
            renderHourlyTimeline(lastWeatherData.hourly);
            renderWeatherTrends(lastWeatherData.hourly);
        }
    }

    function createPremiumFeatures() {
        if ($('weatherFeatures')) return;

        const features = document.createElement('section');

        features.id = 'weatherFeatures';
        features.className = 'glass-panel';
        features.innerHTML = `
            <div class="feature-grid">
                <article class="feature-card">
                    <p class="feature-label">WEATHER VIBE</p>
                    <p id="weatherVibe" class="feature-text"></p>
                </article>

                <article class="feature-card">
                    <p class="feature-label">WHAT TO WEAR</p>
                    <p id="wearSuggestion" class="feature-text"></p>
                </article>
            </div>

            <div class="feature-card hourly-feature">
                <div class="hourly-controls">
                    <div>
                        <p class="feature-label">WEATHER TIMELINE</p>
                        <h3 class="section-title">Hourly Forecast</h3>
                    </div>

                    <label class="forecast-switch">
                        <span>24 hours</span>
                        <input id="hourlyToggle" type="checkbox"
                            aria-label="Show hourly forecast" checked>
                    </label>
                </div>

                <div id="hourlyTimeline" class="hourly-timeline"></div>
            </div>

            <div class="feature-card trends-feature">
                <div class="trends-header">
                    <div>
                        <p class="feature-label">24-HOUR TRENDS</p>
                        <h3 class="section-title">Temperature & Rain</h3>
                    </div>
                    <div class="trends-legend">
                        <span class="legend-item">
                            <span class="legend-indicator legend-temp"></span>
                            Temperature
                        </span>
                        <span class="legend-item">
                            <span class="legend-indicator legend-rain"></span>
                            Precipitation Probability
                        </span>
                    </div>
                </div>
                <div id="trendsGraphWrapper" class="chart-wrapper"></div>
            </div>
        `;

        const forecastSection = document.querySelector('.forecast-section');
        dom.dashboard.insertBefore(features, forecastSection);

        $('hourlyToggle').addEventListener(
            'change',
            updateHourlyVisibility
        );
    }

    function renderFeatures(data, temperature, wind, rain, scene) {
        createPremiumFeatures();

        setText(
            'weatherVibe',
            weatherVibe(temperature, wind, rain, scene)
        );

        setText(
            'wearSuggestion',
            clothingSuggestion(temperature, rain, scene)
        );

        const timeline = $('hourlyTimeline');
        const toggle = $('hourlyToggle');

        if (timeline && toggle) {
            toggle.checked = hourlyMode;
            timeline.classList.toggle('hidden', !hourlyMode);

            if (hourlyMode) {
                renderHourlyTimeline(data.hourly);
            }
        }

        if (data.hourly) {
            renderWeatherTrends(data.hourly);
        }
    }

    function renderForecast(daily) {
        if (!daily?.time) return;

        dom.forecast.replaceChildren(
            ...daily.time.slice(0, 8).map((date, index) => {
                const details = condition(daily.weather_code[index]);
                const rawMax = daily.temperature_2m_max[index];
                const rawMin = daily.temperature_2m_min[index];
                const max = Math.round(Units.temp(rawMax));
                const min = Math.round(Units.temp(rawMin));
                const avg = Math.round((max + min) / 2);
                const rain = Math.round(
                    daily.precipitation_probability_max[index] || 0
                );

                const card = document.createElement('article');

                card.className = 'forecast-card';
                card.innerHTML = `
                    <div>${new Date(`${date}T12:00:00`).toLocaleDateString(
                        'en-US',
                        {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        }
                    )}</div>
                    <div class="forecast-icon">${details[1]}</div>
                    <div class="forecast-temp">
                        ${avg}${Units.tempUnit()}
                    </div>
                    <div class="forecast-temp-range">
                        ${max}° / ${min}° · 💧 ${rain}%
                    </div>
                `;

                return card;
            })
        );
    }

    function renderAirQuality(airData, uvIndexMax = 0) {
        if (!airData?.current) return;
        const current = airData.current;
        const usAqi = current.us_aqi || Math.round((current.european_aqi || 20) * 1.8);
        const uv = current.uv_index !== undefined ? current.uv_index : (uvIndexMax || 3);

        const aqiNumberEl = $('aqiNumber');
        const aqiBarFill = $('aqiBarFill');
        const aqiBadge = $('aqiBadge');
        const aqiStatusText = $('aqiStatusText');
        const aqiAdvice = $('aqiAdvice');

        const uvIndexVal = $('uvIndexVal');
        const uvBarFill = $('uvBarFill');
        const uvAdvice = $('uvAdvice');

        if (aqiNumberEl) aqiNumberEl.textContent = String(Math.round(usAqi));
        if (uvIndexVal) uvIndexVal.textContent = uv.toFixed(1);

        // AQI Categories & Styling
        if (aqiBadge && aqiStatusText && aqiAdvice) {
            aqiBadge.className = 'aqi-badge';
            const pct = Math.min((usAqi / 300) * 100, 100);
            if (aqiBarFill) aqiBarFill.style.width = `${pct}%`;

            if (usAqi <= 50) {
                aqiBadge.classList.add('aqi-good');
                aqiStatusText.textContent = 'AQI ' + Math.round(usAqi) + ' · Good';
                aqiAdvice.textContent = 'Air quality is satisfactory and poses little to no health risk.';
            } else if (usAqi <= 100) {
                aqiBadge.classList.add('aqi-moderate');
                aqiStatusText.textContent = 'AQI ' + Math.round(usAqi) + ' · Moderate';
                aqiAdvice.textContent = 'Air quality is acceptable; unusually sensitive individuals should take care.';
            } else if (usAqi <= 150) {
                aqiBadge.classList.add('aqi-unhealthy-sensitive');
                aqiStatusText.textContent = 'AQI ' + Math.round(usAqi) + ' · Sensitive';
                aqiAdvice.textContent = 'Members of sensitive groups may experience mild respiratory effects.';
            } else if (usAqi <= 200) {
                aqiBadge.classList.add('aqi-unhealthy');
                aqiStatusText.textContent = 'AQI ' + Math.round(usAqi) + ' · Unhealthy';
                aqiAdvice.textContent = 'Everyone may begin to experience health effects; limit prolonged outdoor activity.';
            } else {
                aqiBadge.classList.add('aqi-very-unhealthy');
                aqiStatusText.textContent = 'AQI ' + Math.round(usAqi) + ' · Alert';
                aqiAdvice.textContent = 'Health alert: serious risk of respiratory symptoms for all populations.';
            }
        }

        // UV Categories
        if (uvBarFill && uvAdvice) {
            const uvPct = Math.min((uv / 12) * 100, 100);
            uvBarFill.style.width = `${uvPct}%`;

            if (uv <= 2) {
                uvAdvice.textContent = 'Low danger. Minimal sun protection required for normal outdoor activities.';
            } else if (uv <= 5) {
                uvAdvice.textContent = 'Moderate risk. Wear sunglasses, SPF 30+ sunscreen, and a protective hat.';
            } else if (uv <= 7) {
                uvAdvice.textContent = 'High risk. Seek shade during peak midday hours and apply sunscreen generously.';
            } else if (uv <= 10) {
                uvAdvice.textContent = 'Very high risk. Extra protection essential; avoid direct sun from 11 AM to 4 PM.';
            } else {
                uvAdvice.textContent = 'Extreme risk. Take full precautions; skin can burn quickly in direct sunlight.';
            }
        }

        // Pollutants breakdown
        setText('pm25Val', `${current.pm2_5 ? current.pm2_5.toFixed(1) : '--'} µg/m³`);
        setText('pm10Val', `${current.pm10 ? current.pm10.toFixed(1) : '--'} µg/m³`);
        setText('ozoneVal', `${current.ozone ? current.ozone.toFixed(1) : '--'} µg/m³`);
        setText('no2Val', `${current.nitrogen_dioxide ? current.nitrogen_dioxide.toFixed(1) : '--'} µg/m³`);
        setText('so2Val', `${current.sulphur_dioxide ? current.sulphur_dioxide.toFixed(1) : '--'} µg/m³`);
        setText('coVal', `${current.carbon_monoxide ? current.carbon_monoxide.toFixed(1) : '--'} µg/m³`);
        syncCinematicOverlay();
    }

    async function searchCity(name) {
        activeRequest?.abort();
        activeRequest = new AbortController();

        try {
            setLoading(true);
            dom.error.classList.remove('show');

            const result = await getJson(
                `${API.geo}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`,
                activeRequest.signal
            );

            if (!result.results?.length) {
                throw new Error('City not found. Please check your spelling.');
            }

            const place = result.results[0];

            await loadWeather(
                place.latitude,
                place.longitude,
                place.name,
                place.country_code?.toUpperCase() || '',
                activeRequest.signal
            );
        } catch (error) {
            if (error.name !== 'AbortError') showError(error.message);
        } finally {
            setLoading(false);
            activeRequest = null;
        }
    }

    async function loadWeather(
        latitude,
        longitude,
        city,
        country,
        signal
    ) {
        currentPlace = { city, country, lat: latitude, lon: longitude };
        updateFavoriteButtonState();
        renderQuickCities();

        const cached = cachedWeather(latitude, longitude);

        if (cached) {
            lastWeatherData = cached.data;
            lastAirData = cached.airData || null;
            renderWeather(
                cached.data,
                cached.city,
                cached.country,
                latitude,
                longitude
            );
            if (lastAirData) renderAirQuality(lastAirData, cached.data?.daily?.uv_index_max?.[0]);
            dom.dashboard.classList.remove('hidden');
            dom.empty.classList.add('hidden');
            return;
        }

        const params = new URLSearchParams({
            latitude,
            longitude,
            timezone: 'auto',
            forecast_days: 10,
            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'apparent_temperature',
                'weather_code',
                'cloud_cover',
                'pressure_msl',
                'wind_speed_10m',
                'precipitation',
                'visibility',
                'is_day'
            ].join(','),
            hourly: 'temperature_2m,precipitation,precipitation_probability,weather_code',
            daily: [
                'weather_code',
                'temperature_2m_max',
                'temperature_2m_min',
                'precipitation_probability_max',
                'sunrise',
                'sunset',
                'uv_index_max'
            ].join(',')
        });

        const airParams = new URLSearchParams({
            latitude,
            longitude,
            current: [
                'european_aqi',
                'us_aqi',
                'pm2_5',
                'pm10',
                'ozone',
                'nitrogen_dioxide',
                'sulphur_dioxide',
                'carbon_monoxide',
                'uv_index'
            ].join(',')
        });

        // Parallel fetch for weather and air quality
        const [weatherData, airData] = await Promise.all([
            getJson(`${API.weather}?${params}`, signal),
            getJson(`${API.airQuality}?${airParams}`, signal).catch(() => null)
        ]);

        lastWeatherData = weatherData;
        lastAirData = airData;

        writeCache({
            key: cacheKey(latitude, longitude),
            data: weatherData,
            airData,
            city,
            country
        });

        renderWeather(weatherData, city, country, latitude, longitude);
        if (airData) renderAirQuality(airData, weatherData?.daily?.uv_index_max?.[0]);

        dom.dashboard.classList.remove('hidden');
        dom.empty.classList.add('hidden');

        try {
            if (city && city !== 'Your location') {
                localStorage.setItem('last-weather-city', city);
            }
        } catch {
            // LocalStorage might be restricted
        }
    }

    function renderWeather(data, city, country, latitude, longitude) {
        const { current, daily } = data;
        const details = condition(current.weather_code);
        const rawTemp = Number(current.temperature_2m);
        const rawFeels = Number(current.apparent_temperature);
        const rawWind = Number(current.wind_speed_10m || 0);
        const rawRain = Number(current.precipitation || 0);
        const rawVis = Number(current.visibility || 0) / 1000;
        const rawPress = Number(current.pressure_msl || 1013);
        const clouds = Number(current.cloud_cover ?? 100);
        const scene = details[2];

        lastWeatherData = data;

        dom.body.dataset.scene = scene;
        dom.body.dataset.daytime = Number(current.is_day) === 1
            ? 'day'
            : 'night';
        dom.body.dataset.period = periodFromTime(current.time);
        dom.body.dataset.celestial = celestialState(
            current.weather_code,
            clouds
        );
        dom.body.dataset.tempBand = rawTemp > 26
            ? 'hot'
            : rawTemp > 20
                ? 'warm'
                : rawTemp > 12
                    ? 'mild'
                    : rawTemp > 2
                        ? 'cold'
                        : 'freezing';

        setText(
            'cityName',
            `${city}${country ? `, ${country}` : ''}`
        );

        setText(
            'currentDate',
            new Date(current.time).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        );

        const icon = $('weatherIcon');
        if (icon) icon.innerHTML = weatherIcon(scene);

        // Animate metrics with unit conversion
        const convertedTemp = Units.temp(rawTemp);
        const convertedFeels = Units.temp(rawFeels);
        const convertedWind = Units.wind(rawWind);
        const convertedRain = Units.rain(rawRain);
        const convertedVis = Units.visibility(rawVis);
        const convertedPress = Units.pressure(rawPress);

        animateNumber(
            'temperature',
            convertedTemp,
            value => `${Math.round(value)}${Units.tempUnit()}`
        );

        animateNumber(
            'feelsLike',
            convertedFeels,
            value => `${Math.round(value)}${Units.tempUnit()}`
        );

        animateNumber(
            'humidity',
            current.relative_humidity_2m,
            value => `${Math.round(value)}%`
        );

        animateNumber(
            'windSpeed',
            convertedWind,
            value => `${Math.round(value)} ${Units.windUnit()}`
        );

        animateNumber(
            'pressure',
            convertedPress,
            value => `${unitSystem === 'imperial' ? value.toFixed(2) : Math.round(value)} ${Units.pressUnit()}`
        );

        animateNumber(
            'visibility',
            convertedVis,
            value => `${value.toFixed(1)} ${Units.visUnit()}`
        );

        animateNumber(
            'cloudCover',
            clouds,
            value => `${Math.round(value)}%`
        );

        animateNumber(
            'precipitation',
            convertedRain,
            value => `${convertedRain > 0 ? value.toFixed(2) : '0'} ${Units.rainUnit()}`
        );

        setText('weatherDescription', details[0]);
        setText('sunrise', clock(daily.sunrise[0]));
        setText('sunset', clock(daily.sunset[0]));
        setText('mapCloud', `${Math.round(clouds)}%`);
        setText('mapRain', `${convertedRain > 0 ? convertedRain.toFixed(1) : '0'} ${Units.rainUnit()}`);
        setText('mapWind', `${Math.round(convertedWind)} ${Units.windUnit()}`);
        setText('mapVisibility', `${convertedVis.toFixed(1)} ${Units.visUnit()}`);

        renderFeatures(data, rawTemp, rawWind, rawRain, scene);
        renderForecast(daily);

        const weatherDetail = {
            scene,
            daytime: dom.body.dataset.daytime,
            period: dom.body.dataset.period,
            celestial: dom.body.dataset.celestial,
            windSpeed: rawWind,
            precipitation: rawRain,
            weatherCode: Number(current.weather_code),
            cloudCover: clouds,
            humidity: Number(current.relative_humidity_2m) || 0,
            visibility: Number(current.visibility) || 10000,
            uvIndex: Number(daily?.uv_index_max?.[0]) || 0,
            isDay: current.is_day !== undefined ? Number(current.is_day) : 1,
            latitude: Number(latitude),
            longitude: Number(longitude),
            city: `${city}${country ? `, ${country}` : ''}`
        };
        window.__lastWeatherDetail = weatherDetail;

        document.dispatchEvent(new CustomEvent('weatherchange', {
            detail: weatherDetail
        }));

        syncCinematicOverlay();
        loadMapWhenVisible();
    }

    function toggleUnits() {
        unitSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
        try {
            localStorage.setItem(UNITS_KEY, unitSystem);
        } catch {
            // Local storage disabled
        }

        if (dom.unitToggleLabel) {
            dom.unitToggleLabel.textContent = unitSystem === 'metric' ? '°C' : '°F';
        }

        if (lastWeatherData && currentPlace.city) {
            renderWeather(
                lastWeatherData,
                currentPlace.city,
                currentPlace.country,
                currentPlace.lat,
                currentPlace.lon
            );
        } else {
            syncCinematicOverlay();
        }
    }

    function useLocation(fallbackToDefault = false) {
        if (locationLocked) return;

        if (!navigator.geolocation) {
            if (fallbackToDefault) {
                searchCity('London');
            } else {
                showError('Geolocation is not supported.');
            }
            return;
        }

        locationLocked = true;
        dom.location.disabled = true;
        dom.error.classList.remove('show');

        let handled = false;
        const safetyTimer = setTimeout(() => {
            if (!handled) {
                handled = true;
                locationLocked = false;
                dom.location.disabled = false;
                if (fallbackToDefault && dom.dashboard.classList.contains('hidden')) {
                    searchCity('London');
                } else if (!fallbackToDefault) {
                    showError('Location request timed out. Please try searching for your city.');
                }
            }
        }, 4500);

        navigator.geolocation.getCurrentPosition(
            async position => {
                if (handled) return;
                handled = true;
                clearTimeout(safetyTimer);
                const { latitude, longitude } = position.coords;

                try {
                    setLoading(true);

                    await loadWeather(
                        latitude,
                        longitude,
                        'Your location',
                        ''
                    );

                    dom.dashboard.classList.remove('hidden');
                    dom.empty.classList.add('hidden');
                } catch (error) {
                    showError(error.message);
                    if (fallbackToDefault) {
                        searchCity('London');
                    }
                } finally {
                    setLoading(false);
                    locationLocked = false;
                    dom.location.disabled = false;
                }
            },
            error => {
                if (handled) return;
                handled = true;
                clearTimeout(safetyTimer);
                locationLocked = false;
                dom.location.disabled = false;

                if (fallbackToDefault) {
                    searchCity('London');
                } else {
                    showError(
                        error.code === 1
                            ? 'Location access was denied. Please allow location permission.'
                            : 'Unable to determine your location.'
                    );
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 4500,
                maximumAge: 300000
            }
        );
    }

    function isCinematicActive() {
        return document.body.classList.contains('cinematic-fullscreen');
    }

    function updateFullscreenButtonState(active) {
        const btn = $('fullscreenButton');
        if (btn) {
            btn.innerHTML = active
                ? '<span class="toolbar-icon">⛶</span><span class="toolbar-label" id="fullscreenText">Exit</span>'
                : '<span class="toolbar-icon">⛶</span><span class="toolbar-label" id="fullscreenText">Cinema</span>';
            btn.setAttribute('aria-pressed', String(active));
        }
        const overlay = $('cinematicModeOverlay');
        if (overlay) {
            overlay.setAttribute('aria-hidden', String(!active));
        }
    }

    function syncCinematicOverlay() {
        if (!lastWeatherData) return;
        const { current, daily } = lastWeatherData;
        if (!current) return;

        const details = condition(current.weather_code);
        const rawTemp = Number(current.temperature_2m);
        const rawFeels = Number(current.apparent_temperature);
        const rawWind = Number(current.wind_speed_10m || 0);
        const rawRain = Number(current.precipitation || 0);
        const scene = details[2];

        const convertedTemp = Math.round(Units.temp(rawTemp));
        const convertedFeels = Math.round(Units.temp(rawFeels));
        const convertedWind = Math.round(Units.wind(rawWind));
        const convertedRain = Units.rain(rawRain);

        dom.body.dataset.tempBand = rawTemp > 26
            ? 'hot'
            : rawTemp > 20
                ? 'warm'
                : rawTemp > 12
                    ? 'mild'
                    : rawTemp > 2
                        ? 'cold'
                        : 'freezing';

        setText('cinematicCityName', currentPlace.city || 'London');
        setText('cinematicDate', new Date(current.time).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));

        setText('cinematicTempNum', `${convertedTemp}`);
        setText('cinematicFeelsLike', `${convertedFeels}${Units.tempUnit()}`);

        const isMetric = unitSystem === 'metric';
        const btnC = $('cinematicUnitBtnC');
        const btnF = $('cinematicUnitBtnF');
        if (btnC && btnF) {
            btnC.classList.toggle('active', isMetric);
            btnF.classList.toggle('active', !isMetric);
            btnC.setAttribute('aria-pressed', String(isMetric));
            btnF.setAttribute('aria-pressed', String(!isMetric));
        }

        const iconEl = $('cinematicWeatherIcon');
        if (iconEl) {
            iconEl.innerHTML = weatherIcon(scene);
        }

        setText('cinematicDescription', details[0]);

        setText('cinematicHumidity', `${Math.round(current.relative_humidity_2m || 0)}%`);
        setText('cinematicWind', `${convertedWind} ${Units.windUnit()}`);
        setText('cinematicRain', `${convertedRain > 0 ? convertedRain.toFixed(1) : '0'} ${Units.rainUnit()}`);

        if (lastAirData?.current) {
            const aqiVal = Math.round(lastAirData.current.us_aqi ?? ((lastAirData.current.european_aqi || 20) * 1.8));
            const aqiLevel = aqiVal <= 50 ? 'Good' : aqiVal <= 100 ? 'Moderate' : aqiVal <= 150 ? 'Sensitive' : 'Unhealthy';
            setText('cinematicAqi', `${aqiVal} · ${aqiLevel}`);
        } else {
            setText('cinematicAqi', 'Optimal');
        }

        const uvVal = daily?.uv_index_max?.[0] ?? current?.uv_index ?? 3;
        setText('cinematicUv', `${Number(uvVal).toFixed(1)}`);
    }

    async function setCinematicMode(active) {
        if (active) {
            syncCinematicOverlay();
            document.body.classList.add('cinematic-fullscreen');
            updateFullscreenButtonState(true);

            if (document.fullscreenEnabled && !document.fullscreenElement) {
                try {
                    await document.documentElement.requestFullscreen();
                } catch {
                    // Handled gracefully in iframe or restricted environments
                }
            }
        } else {
            document.body.classList.remove('cinematic-fullscreen');
            updateFullscreenButtonState(false);

            if (document.fullscreenElement) {
                try {
                    await document.exitFullscreen();
                } catch {
                    // Handled gracefully
                }
            }
        }
    }

    async function toggleFullscreen() {
        const nextState = !isCinematicActive();
        await setCinematicMode(nextState);
    }

    function setTheme(theme) {
        dom.body.dataset.theme = theme;

        const light = theme === 'light';
        dom.theme.innerHTML = light
            ? '<span class="toolbar-icon">🌙</span><span class="toolbar-label" id="themeText">Dark</span>'
            : '<span class="toolbar-icon">☀️</span><span class="toolbar-label" id="themeText">Light</span>';
        dom.theme.setAttribute('aria-pressed', String(light));
    }

    function loadMapWhenVisible() {
        if (mapLoading || window.L) return;

        mapLoading = true;

        const leafletCss = document.createElement('link');
        leafletCss.rel = 'stylesheet';
        leafletCss.href =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCss);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

        script.onload = () => {
            const cinematic = document.createElement('script');
            cinematic.src = 'js/cinematic.js';
            document.body.appendChild(cinematic);
        };

        document.body.appendChild(script);
    }

    // Event Listeners
    dom.search.addEventListener('click', () => {
        const value = dom.input.value.trim();
        if (value) searchCity(value);
    });

    dom.input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            dom.search.click();
        }
    });

    dom.location.addEventListener('click', useLocation);

    if (dom.unitToggle) {
        dom.unitToggle.addEventListener('click', toggleUnits);
        if (dom.unitToggleLabel) {
            dom.unitToggleLabel.textContent = unitSystem === 'metric' ? '°C' : '°F';
        }
    }

    if (dom.favoriteBtn) {
        dom.favoriteBtn.addEventListener('click', toggleFavorite);
    }

    dom.theme.addEventListener('click', () => {
        setTheme(
            dom.body.dataset.theme === 'light'
                ? 'dark'
                : 'light'
            );
    });

    // Cinematic Mode Controls
    $('fullscreenButton')?.addEventListener('click', toggleFullscreen);

    $('cinematicExitButton')?.addEventListener('click', () => {
        setCinematicMode(false);
    });

    // Creative unit switching interactions in cinematic mode
    $('cinematicTemperature')?.addEventListener('click', toggleUnits);
    $('cinematicTemperature')?.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleUnits();
        }
    });

    $('cinematicUnitBtnC')?.addEventListener('click', event => {
        event.stopPropagation();
        if (unitSystem !== 'metric') {
            toggleUnits();
        }
    });

    $('cinematicUnitBtnF')?.addEventListener('click', event => {
        event.stopPropagation();
        if (unitSystem !== 'imperial') {
            toggleUnits();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && isCinematicActive()) {
            setCinematicMode(false);
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (isCinematicActive()) {
                event.preventDefault();
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                    document.activeElement?.blur();
                }
                setCinematicMode(false);
                return;
            }
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                dom.input.blur();
                return;
            }
        }

        // Ignore shortcut if user is typing in an input
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            return;
        }

        if (event.key === '/' || event.key === 'k') {
            event.preventDefault();
            dom.input.focus();
            dom.input.select();
        } else if (event.key === 'u' || event.key === 'U') {
            event.preventDefault();
            toggleUnits();
        } else if (event.key === 'm' || event.key === 'M') {
            event.preventDefault();
            toggleFullscreen();
        } else if (event.key === 'l' || event.key === 'L') {
            event.preventDefault();
            useLocation();
        }
    });

    document.addEventListener('maplocationchange', async event => {
        const { latitude, longitude } = event.detail || {};

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        // Avoid re-fetching if coordinates are virtually identical to currentPlace
        if (currentPlace && Number.isFinite(currentPlace.lat)) {
            const dLat = Math.abs(latitude - currentPlace.lat);
            const dLon = Math.abs(longitude - currentPlace.lon);
            if (dLat < 0.08 && dLon < 0.08) {
                return;
            }
        }

        try {
            setLoading(true);

            await loadWeather(
                latitude,
                longitude,
                `Map location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
                ''
            );

            dom.dashboard.classList.remove('hidden');
            dom.empty.classList.add('hidden');
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    });

    if (dom.mapSection && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                loadMapWhenVisible();
                observer.disconnect();
            }
        }, { rootMargin: '300px' });

        observer.observe(dom.mapSection);
    }

    // Initialize
    createPremiumFeatures();
    renderQuickCities();
    setTheme('dark');

    // Ensure back link destinations are cleanly assigned
    const returnLinks = document.querySelectorAll('.weather-back-link');
    returnLinks.forEach(link => {
        const targetUrl = link.getAttribute('data-portfolio-return') || link.getAttribute('href');
        if (targetUrl) {
            link.setAttribute('href', targetUrl);
        }
    });

    // Automatically load initial city or cached city immediately so the dashboard is vibrant and visible on load
    const savedCity = localStorage.getItem('last-weather-city') || 'London';
    searchCity(savedCity);

    // If geolocation is available and user hasn't explicitly chosen a saved city, gracefully check location
    if (navigator.geolocation && !localStorage.getItem('last-weather-city')) {
        setTimeout(() => {
            useLocation(false);
        }, 1000);
    }
})();
