const form = document.getElementById("weather-form");
const result = document.getElementById("weather-result");
const statusEl = document.getElementById("weather-status");
const cityName = document.getElementById("city-name");
const tempEl = document.getElementById("temp");
const conditionEl = document.getElementById("condition");
const conditionIcon = document.getElementById("condition-icon");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const feelsLikeEl = document.getElementById("feels-like");
const uvIndexEl = document.getElementById("uv-index");
const pressureEl = document.getElementById("pressure");
const todayRangeEl = document.getElementById("today-range");
const forecastCardsGrid = document.getElementById("forecast-cards-grid");
const recentSearchesRow = document.getElementById("recent-searches-row");
const recentChipsContainer = document.getElementById("recent-chips");
const geoBtn = document.getElementById("geo-btn");
const cityInput = document.getElementById("city-input");
const submitButton = form.querySelector("button[type='submit']");

let unit = "c";
let lastPlace = null;
let lastData = null;
const RECENT_KEY = "zaheer-weather-recent-cities";

const weatherLabels = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Heavy showers",
    82: "Violent showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Heavy thunderstorm"
};

const weatherIcons = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌧️",
    55: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    71: "🌨️",
    73: "❄️",
    75: "❄️",
    80: "🌦️",
    81: "🌧️",
    82: "⛈️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️"
};

function setStatus(message, type = "info") {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.type = type;
    statusEl.hidden = !message;
}

function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Loading…" : "Search";
}

// Recent Searches Management
function getRecentCities() {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        return raw ? JSON.parse(raw) : ["London", "Tokyo", "New York"];
    } catch {
        return ["London", "Tokyo", "New York"];
    }
}

function addRecentCity(name) {
    if (!name) return;
    try {
        let recents = getRecentCities().filter(c => c.toLowerCase() !== name.toLowerCase());
        recents.unshift(name);
        recents = recents.slice(0, 5);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
        renderRecentCities();
    } catch {}
}

function renderRecentCities() {
    if (!recentSearchesRow || !recentChipsContainer) return;
    const cities = getRecentCities();
    if (!cities.length) {
        recentSearchesRow.hidden = true;
        return;
    }
    recentSearchesRow.hidden = false;
    recentChipsContainer.innerHTML = cities.map(c => `
        <button type="button" class="recent-chip" data-recent-city="${escapeHtml(c)}">${escapeHtml(c)}</button>
    `).join("");
}

async function geocodeCity(city) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", city);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not look up that city.");

    const data = await response.json();
    if (!data.results?.length) throw new Error("City not found. Try another spelling.");

    return data.results[0];
}

async function fetchWeather(place) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(place.latitude));
    url.searchParams.set("longitude", String(place.longitude));
    url.searchParams.set(
        "current",
        "temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,weather_code,uv_index"
    );
    url.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    );
    url.searchParams.set("temperature_unit", unit === "c" ? "celsius" : "fahrenheit");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather service is unavailable right now.");

    const data = await response.json();
    return data;
}

function renderWeather(place, data) {
    lastData = data;
    const current = data.current;
    const daily = data.daily || {};
    const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    const code = current.weather_code;
    const unitLabel = unit === "c" ? "°C" : "°F";

    cityName.textContent = label;
    tempEl.textContent = `${Math.round(current.temperature_2m)}${unitLabel}`;
    conditionEl.textContent = weatherLabels[code] || "Current conditions";
    if (conditionIcon) {
        conditionIcon.textContent = weatherIcons[code] || "🌡️";
    }

    if (feelsLikeEl) {
        const feels = current.apparent_temperature != null ? Math.round(current.apparent_temperature) : Math.round(current.temperature_2m);
        feelsLikeEl.textContent = `${feels}${unitLabel}`;
    }

    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    if (uvIndexEl) {
        const uv = current.uv_index != null ? Number(current.uv_index).toFixed(1) : "--";
        uvIndexEl.textContent = uv;
    }

    if (pressureEl) {
        const press = current.surface_pressure != null ? `${Math.round(current.surface_pressure)} hPa` : "--";
        pressureEl.textContent = press;
    }

    if (todayRangeEl && daily.temperature_2m_max?.length) {
        const maxT = Math.round(daily.temperature_2m_max[0]);
        const minT = Math.round(daily.temperature_2m_min[0]);
        todayRangeEl.textContent = `${minT}° / ${maxT}${unitLabel}`;
    }

    // Render 5-Day Daily Outlook
    if (forecastCardsGrid && daily.time?.length) {
        const days = daily.time.slice(1, 6); // next 5 days
        forecastCardsGrid.innerHTML = days.map((dateStr, idx) => {
            const dayIndex = idx + 1;
            const dateObj = new Date(dateStr + "T12:00:00");
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const dayCode = daily.weather_code[dayIndex] || 0;
            const maxTemp = Math.round(daily.temperature_2m_max[dayIndex]);
            const minTemp = Math.round(daily.temperature_2m_min[dayIndex]);
            const rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[dayIndex] : 0;

            return `
                <div class="forecast-mini-card">
                    <span class="forecast-card-day">${dayName}</span>
                    <span class="forecast-card-icon" aria-hidden="true">${weatherIcons[dayCode] || "🌤️"}</span>
                    <span class="forecast-card-temp">${maxTemp}${unitLabel}</span>
                    <span class="forecast-card-min">${minTemp}°</span>
                    <span class="forecast-card-rain">💧 ${rainProb}%</span>
                </div>
            `;
        }).join("");
    }

    result.hidden = false;
    setStatus("Live data from Open-Meteo.", "success");
    addRecentCity(place.name);
}

async function showWeather(city) {
    setLoading(true);
    setStatus("Fetching live weather & 5-day outlook…", "info");
    result.hidden = true;

    try {
        const place = await geocodeCity(city);
        lastPlace = place;
        const data = await fetchWeather(place);
        renderWeather(place, data);
    } catch (error) {
        setStatus(error.message || "Something went wrong. Try again.", "error");
    } finally {
        setLoading(false);
    }
}

async function showWeatherByCoords(lat, lon, labelName = "Your Location") {
    setLoading(true);
    setStatus("Looking up coordinates…", "info");
    result.hidden = true;

    try {
        const place = {
            name: labelName,
            admin1: "",
            country: "",
            latitude: lat,
            longitude: lon
        };
        lastPlace = place;
        const data = await fetchWeather(place);
        renderWeather(place, data);
    } catch (error) {
        setStatus("Could not fetch weather for your coordinates.", "error");
    } finally {
        setLoading(false);
    }
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        showWeather(city);
    }
});

// Quick city buttons
document.querySelectorAll(".city-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
        const city = btn.dataset.city;
        if (city) {
            cityInput.value = city;
            showWeather(city);
        }
    });
});

// Recent cities click handler
if (recentChipsContainer) {
    recentChipsContainer.addEventListener("click", (e) => {
        const chip = e.target.closest(".recent-chip");
        if (chip) {
            const city = chip.dataset.recentCity;
            if (city) {
                cityInput.value = city;
                showWeather(city);
            }
        }
    });
}

// Unit switch
document.querySelectorAll(".unit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const newUnit = btn.dataset.unit;
        if (newUnit === unit) return;

        unit = newUnit;
        document.querySelectorAll(".unit-btn").forEach((b) => {
            b.classList.toggle("is-active", b === btn);
        });

        if (lastPlace) {
            setLoading(true);
            try {
                const data = await fetchWeather(lastPlace);
                renderWeather(lastPlace, data);
            } catch (err) {
                setStatus("Could not convert units.", "error");
            } finally {
                setLoading(false);
            }
        }
    });
});

// Geolocation button
if (geoBtn) {
    geoBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
            setStatus("Geolocation is not supported by your browser.", "error");
            return;
        }

        setStatus("Locating you…", "info");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                showWeatherByCoords(pos.coords.latitude, pos.coords.longitude, "Current Location");
            },
            () => {
                setStatus("Unable to retrieve your location.", "error");
            },
            { timeout: 10000 }
        );
    });
}

function escapeHtml(string) {
    return String(string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

renderRecentCities();
const initialCity = localStorage.getItem("zaheer-weather-last-city") || "London";
cityInput.value = initialCity;
showWeather(initialCity);
