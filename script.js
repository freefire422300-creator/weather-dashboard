// Weather Dashboard - Open-Meteo API
// API Documentation: https://open-meteo.com/en/docs

const API_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    weatherCard: document.getElementById('weatherCard'),
    weatherDetails: document.getElementById('weatherDetails'),
    forecastSection: document.getElementById('forecastSection'),
    hourlySection: document.getElementById('hourlySection'),
    forecastGrid: document.getElementById('forecastGrid'),
    hourlyGrid: document.getElementById('hourlyGrid'),
    suggestions: document.getElementById('suggestions'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText')
};

let selectedCity = null;

// Event Listeners
elements.searchBtn.addEventListener('click', handleSearch);
elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

elements.searchInput.addEventListener('input', handleSuggestions);

// Search Handler
async function handleSearch() {
    const query = elements.searchInput.value.trim();
    if (!query) return;

    try {
        hideError();
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            showError('شهری یافت نشد. لطفاً نام شهر را دوباره وارد کنید.');
            return;
        }

        selectedCity = data.results[0];
        await fetchWeatherData(selectedCity);
        elements.suggestions.classList.remove('show');
    } catch (error) {
        showError('خطا در جستجو. لطفاً دوباره سعی کنید.');
        console.error('Search error:', error);
    }
}

// Suggestions Handler
async function handleSuggestions(e) {
    const query = e.target.value.trim();
    if (query.length < 2) {
        elements.suggestions.classList.remove('show');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            elements.suggestions.classList.remove('show');
            return;
        }

        elements.suggestions.innerHTML = data.results
            .map(city => `
                <div class="suggestion-item" onclick="selectCity('${city.name}', '${city.country}', ${city.latitude}, ${city.longitude})">
                    <strong>${city.name}</strong>, ${city.country}
                </div>
            `)
            .join('');
        
        elements.suggestions.classList.add('show');
    } catch (error) {
        console.error('Suggestions error:', error);
    }
}

// Select City from Suggestions
async function selectCity(name, country, lat, lon) {
    selectedCity = { name, country, latitude: lat, longitude: lon };
    elements.searchInput.value = `${name}, ${country}`;
    elements.suggestions.classList.remove('show');
    await fetchWeatherData(selectedCity);
}

// Fetch Weather Data
async function fetchWeatherData(city) {
    try {
        hideError();
        showLoading();

        const params = new URLSearchParams({
            latitude: city.latitude,
            longitude: city.longitude,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,visibility',
            hourly: 'temperature_2m,weather_code,precipitation_probability',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
            temperature_unit: 'celsius',
            wind_speed_unit: 'kmh',
            precipitation_unit: 'mm',
            timezone: 'auto'
        });

        const response = await fetch(`${WEATHER_API_URL}?${params}`);
        const data = await response.json();

        displayCurrentWeather(data, city);
        displayForecast(data);
        displayHourlyForecast(data);
    } catch (error) {
        showError('خطا در دریافت اطلاعات هوا. لطفاً دوباره سعی کنید.');
        console.error('Weather fetch error:', error);
    }
}

// Display Current Weather
function displayCurrentWeather(data, city) {
    const current = data.current;
    const icon = getWeatherIcon(current.weather_code);
    const description = getWeatherDescription(current.weather_code);
    const date = new Date(current.time).toLocaleDateString('fa-IR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    elements.weatherCard.innerHTML = `
        <div class="weather-main">
            <div class="location-info">
                <h2>${city.name}, ${city.country}</h2>
                <p>${date}</p>
            </div>
            <div class="temp-section">
                <i class="fas ${icon} weather-icon"></i>
                <div>
                    <div class="temp-value">${Math.round(current.temperature_2m)}<span class="temp-unit">°C</span></div>
                </div>
            </div>
        </div>
        <div class="weather-description">
            <div class="weather-desc-item">
                <span class="label">وضعیت</span>
                <span class="value">${description}</span>
            </div>
            <div class="weather-desc-item">
                <span class="label">احساس دما</span>
                <span class="value">${Math.round(current.apparent_temperature)}°C</span>
            </div>
            <div class="weather-desc-item">
                <span class="label">رطوبت</span>
                <span class="value">${current.relative_humidity_2m}%</span>
            </div>
            <div class="weather-desc-item">
                <span class="label">سرعت باد</span>
                <span class="value">${Math.round(current.wind_speed_10m)} km/h</span>
            </div>
        </div>
    `;

    // Update details section
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('pressure').textContent = `${Math.round(current.pressure_msl)} hPa`;
    document.getElementById('visibility').textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°C`;

    elements.weatherDetails.style.display = 'block';
}

// Display Forecast
function displayForecast(data) {
    const daily = data.daily;
    
    let html = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('fa-IR', { weekday: 'short' });
        const icon = getWeatherIcon(daily.weather_code[i]);
        const description = getWeatherDescription(daily.weather_code[i]);
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const precipitation = daily.precipitation_probability_max[i];

        html += `
            <div class="forecast-card">
                <div class="day">${dayName}</div>
                <i class="fas ${icon} icon"></i>
                <div class="temp-min-max">${maxTemp}° / ${minTemp}°</div>
                <div class="temp-min">${precipitation}% بارش</div>
                <div class="condition">${description}</div>
            </div>
        `;
    }

    elements.forecastGrid.innerHTML = html;
    elements.forecastSection.style.display = 'block';
}

// Display Hourly Forecast
function displayHourlyForecast(data) {
    const hourly = data.hourly;
    const currentIndex = new Date().getHours();
    
    let html = '';
    for (let i = currentIndex; i < currentIndex + 24 && i < hourly.time.length; i++) {
        const date = new Date(hourly.time[i]);
        const hour = date.getHours().toString().padStart(2, '0');
        const icon = getWeatherIcon(hourly.weather_code[i]);
        const temp = Math.round(hourly.temperature_2m[i]);
        const precipitation = hourly.precipitation_probability[i] || 0;

        html += `
            <div class="hourly-card">
                <div class="time">${hour}:00</div>
                <i class="fas ${icon} icon"></i>
                <div class="temp">${temp}°C</div>
                <div class="condition">${precipitation}% بارش</div>
            </div>
        `;
    }

    elements.hourlyGrid.innerHTML = html;
    elements.hourlySection.style.display = 'block';
}

// Weather Icon Mapping
function getWeatherIcon(code) {
    const iconMap = {
        0: 'fa-sun',              // Clear sky
        1: 'fa-cloud-sun',        // Mainly clear
        2: 'fa-cloud',            // Partly cloudy
        3: 'fa-cloud',            // Overcast
        45: 'fa-cloud-fog',       // Foggy
        48: 'fa-cloud-fog',       // Depositing rime fog
        51: 'fa-cloud-rain',      // Light drizzle
        53: 'fa-cloud-rain',      // Moderate drizzle
        55: 'fa-cloud-rain',      // Dense drizzle
        61: 'fa-cloud-rain',      // Slight rain
        63: 'fa-cloud-rain',      // Moderate rain
        65: 'fa-cloud-showers-heavy',  // Heavy rain
        71: 'fa-snowflake',       // Slight snow
        73: 'fa-snowflake',       // Moderate snow
        75: 'fa-snowflake',       // Heavy snow
        77: 'fa-snowflake',       // Snow grains
        80: 'fa-cloud-rain',      // Slight rain showers
        81: 'fa-cloud-showers-heavy',  // Moderate rain showers
        82: 'fa-cloud-showers-heavy',  // Violent rain showers
        85: 'fa-snowflake',       // Slight snow showers
        86: 'fa-snowflake',       // Heavy snow showers
        95: 'fa-bolt',            // Thunderstorm
        96: 'fa-bolt',            // Thunderstorm with hail
        99: 'fa-bolt'             // Thunderstorm with heavy hail
    };
    return iconMap[code] || 'fa-question';
}

// Weather Description
function getWeatherDescription(code) {
    const descriptions = {
        0: 'آسمان صاف',
        1: 'عمدتاً صاف',
        2: 'تا حدی ابری',
        3: 'ابری',
        45: 'مه',
        48: 'مه و یخ',
        51: 'چھینٹیاں سبک',
        53: 'چھینٹیاں متوسط',
        55: 'چھینٹیاں شدید',
        61: 'بارش سبک',
        63: 'بارش متوسط',
        65: 'بارش شدید',
        71: 'برف سبک',
        73: 'برف متوسط',
        75: 'برف شدید',
        77: 'دانه های برف',
        80: 'رگبار سبک',
        81: 'رگبار متوسط',
        82: 'رگبار شدید',
        85: 'برف شدید سبک',
        86: 'برف شدید',
        95: 'گرج و برق',
        96: 'گرج و برق با تگرگ',
        99: 'گرج و برق شدید'
    };
    return descriptions[code] || 'نامعلوم';
}

// UI Helpers
function showLoading() {
    elements.weatherCard.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    elements.weatherCard.classList.add('loading');
}

function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.style.display = 'flex';
}

function hideError() {
    elements.errorMessage.style.display = 'none';
}

// Load default weather on page load
window.addEventListener('load', () => {
    // Default: Tehran
    selectedCity = { name: 'تهران', country: 'ایران', latitude: 35.6892, longitude: 51.3890 };
    elements.searchInput.value = 'Tehran, Iran';
    fetchWeatherData(selectedCity);
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== elements.searchInput && e.target !== elements.suggestions) {
        elements.suggestions.classList.remove('show');
    }
});