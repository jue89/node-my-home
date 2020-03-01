const https = require('https');
const url = require('url')
const assert = require('assert');
const regression = require('regression');
const {getSunrise, getSunset} = require('sunrise-sunset-js');
const linterpol = require('linterpol');
const secrets = require('./secrets.json');

// Fetches the forecast for 5 days with 3 hour accurancy at given geofix
const fetchForecast = ([lat, lon]) => new Promise((resolve, reject) => {
	const apiEndpoint = url.parse(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${secrets.owm.appid}`);
	https.get(apiEndpoint, (res) => {
		const chunks = [];
		res.on('data', (chunk) => chunks.push(chunk));
		res.on('end', () => {
			const body = Buffer.concat(chunks).toString();
			if (res.statusCode === 200) {
				const response = JSON.parse(body);
				resolve(response);
			} else {
				reject(new Error(body));
			}
		});
	}).on('error', (err) => reject(err));
});

// Extract insteresting data from the forecast
const parseForecast = (data) => data.list.map((p) => ({
	date: p.dt * 1000 + 1.5 * 3600000,
	temp: p.main.temp - 273.15,                                 // °C
	rain: (p.rain && p.rain['3h']) ? p.rain['3h'] / 3 : 0,      // L/h
	wind: (p.wind && p.wind.speed) ? p.wind.speed * 3.6 : 0,    // km/h
	clouds: (p.clouds && p.clouds.all) ? p.clouds.all / 100 : 0 // 0..1
}));

// Approximate values
const approximate = (date, points) => {
	// We don't aproximate on exact matches
	const exactMatch = points.find((p) => p.date === date);
	if (exactMatch) return exactMatch;

	// Find indexes of the interval in question
	const idxRight = points.findIndex((p) => p.date > date);
	assert(idxRight > 0, 'date is out of bounds');
	const idxLeft = idxRight -1;

	// Approximate point
	const left = points[idxLeft];
	const right = points[idxRight];
	const leftTime = left.date;
	const rightTime = right.date;
	const keys = Object.keys(left).filter((k) => k != 'date');
	const approx = keys.reduce((approx, key) => {
		const {predict} = regression.linear([[leftTime, left[key]], [rightTime, right[key]]]);
		approx[key] = predict(date)[1];
		return approx;
	}, {});

	return approx;
}

// Get daylight from date for given geofix
const DAYLIGHT_OFFSET = 3600000;
const daylight = (date, [lat, lon]) => {
	const sunrise = getSunrise(lat, lon, new Date(date)).getTime();
	const sunset = getSunset(lat, lon, new Date(date)).getTime();
	return linterpol(date, [
		[sunrise - DAYLIGHT_OFFSET, 0],
		[sunrise + DAYLIGHT_OFFSET, 1],
		[sunset - DAYLIGHT_OFFSET, 1],
		[sunset + DAYLIGHT_OFFSET, 0],
	]);
};

// Score forecast for motorcycling: 100 is the best score, 0 the worst
const SCORE_BASE = 100;
const rate = (x, decay) => {
	let score = Object.entries(x).reduce((score, [key, value]) => {
		if (decay[key]) score -= decay[key](value);
		return score;
	}, SCORE_BASE);
	if (score > SCORE_BASE) score = SCORE_BASE;
	if (score < 0) score = 0;
	return score;
}

const getForecast = async (date, geofix) => {
	const body = await fetchForecast(geofix);
	const points = parseForecast(body);
	const prediction = approximate(date, points);
	prediction.daylight = daylight(date, geofix);
	prediction.score = rate(prediction, {
		temp: (x) => Math.pow(x - 22, 2), // 12..32°C with optimum at 22°C
		wind: (x) => 2.5 * x - 75,        // 30..70km/h with optimum slower than 30km/h
		clouds: (x) => x * 10,            // Max cost: 10
		rain: (x) => Math.sqrt(x) * 100,  // 0..1L/h
		daylight: (x) => x * 100
	});
	return prediction;
};

module.exports = [require('ftrm-basic/generic'), {
	output: {
		'temp': 'home.haj.atf8.outside.forecast.temperature_degC',
		'wind': 'home.haj.atf8.outside.forecast.wind_kmph',
		'clouds': 'home.haj.atf8.outside.forecast.clouds',
		'rain': 'home.haj.atf8.outside.forecast.rain_Lph',
		'daylight': 'home.haj.atf8.outside.forecast.daylight',
		'score': 'home.haj.atf8.outside.forecast.motorcycleFunScore'
	},
	factory: (input, output, log) => {
		const INTERVAL = 10 * 60 * 1000; // 10 minutes
		const interval = setInterval(async () => {
			try {
				// Fetch forecast 6h in the future
				const date = Date.now() + 6 * 3600 * 1000;
				const prediction = await getForecast(date, secrets.atf8.geofix);
				Object.entries(prediction).forEach(([key, value]) => {
					if (output[key]) output[key].set(value, date);
				});
			} catch (err) {
				log.error(err);
			}
		}, INTERVAL);
		return () => clearInterval(interval);
	}
}];
