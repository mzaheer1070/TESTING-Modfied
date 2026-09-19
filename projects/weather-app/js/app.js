const form = document.getElementById("weather-form");
const result = document.getElementById("weather-result");
const statusEl = document.getElementById("weather-status");
const cityName = document.getElementById("city-name");
const tempEl = document.getElementById("temp");
const conditionEl = document.getElementById("condition");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const submitButton = form.querySelector("button[type='submit']");

let unit = "c";
let lastPlace = null;

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
    95: "Thunderstorm"
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
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code");
    url.searchParams.set("temperature_unit", unit === "c" ? "celsius" : "fahrenheit");
    url.searchParams.set("wind_speed_unit", "kmh");

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather service is unavailable right now.");

    const data = await response.json();
    return data.current;
}

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
    95: "⛈️"
};

const conditionIcon = document.getElementById("condition-icon");
const geoBtn = document.getElementById("geo-btn");
const cityInput = document.getElementById("city-input");

function renderWeather(place, current) {
    const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    const code = current.weather_code;
    const unitLabel = unit === "c" ? "°C" : "°F";

    cityName.textContent = label;
    tempEl.textContent = `${Math.round(current.temperature_2m)}${unitLabel}`;
    conditionEl.textContent = weatherLabels[code] || "Current conditions";
    if (conditionIcon) {
        conditionIcon.textContent = weatherIcons[code] || "🌡️";
    }
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    result.hidden = false;
    setStatus("Live data from Open-Meteo.", "success");
    try {
        localStorage.setItem("zaheer-weather-last-city", place.name);
    } catch (e) {}
}

async function showWeather(city) {
    setLoading(true);
    setStatus("Fetching live weather…", "info");
    result.hidden = true;

    try {
        const place = await geocodeCity(city);
        lastPlace = place;
        const current = await fetchWeather(place);
        renderWeather(place, current);
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
        const place = { name: labelName, latitude: lat, longitude: lon };
        lastPlace = place;
        const current = await fetchWeather(place);
        renderWeather(place, current);
    } catch (error) {
        setStatus(error.message || "Could not fetch weather for coordinates.", "error");
    } finally {
        setLoading(false);
    }
}

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
            (err) => {
                setStatus("Could not get location. Please search by city name.", "error");
            },
            { timeout: 8000 }
        );
    });
}

document.querySelectorAll(".city-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
        const city = chip.dataset.city;
        if (city) {
            if (cityInput) cityInput.value = city;
            showWeather(city);
        }
    });
});

document.querySelectorAll(".unit-btn").forEach((button) => {
    button.addEventListener("click", async () => {
        unit = button.dataset.unit;
        document.querySelectorAll(".unit-btn").forEach((item) => {
            item.classList.toggle("is-active", item === button);
        });

        if (lastPlace) {
            setLoading(true);
            try {
                const current = await fetchWeather(lastPlace);
                renderWeather(lastPlace, current);
            } catch (error) {
                setStatus(error.message || "Could not refresh weather.", "error");
            } finally {
                setLoading(false);
            }
        }
    });
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const city = cityInput ? cityInput.value.trim() : "";
    if (!city) return;
    showWeather(city);
});

const initialCity = (() => {
    try {
        return localStorage.getItem("zaheer-weather-last-city") || "Karachi";
    } catch (e) {
        return "Karachi";
    }
})();

if (cityInput) cityInput.value = initialCity;
showWeather(initialCity);
