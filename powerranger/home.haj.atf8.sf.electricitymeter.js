const EventEmitter = require('events')
const Poll = require('../_lib/poll.js');
const Median = require('../_lib/median.js');

const WHPERPULSE = 1000 / 375;

// Event emitter for pluses
const electricityMeter = new EventEmitter();

// Detect pulsed
const p = new Poll('/sys/bus/iio/devices/iio:device0/in_voltage0_raw', 20);
p.once('value', (initValue) => {
	const denoise = new Median(5, initValue);
	const baseLine = new Median(601, initValue);
	
	let lastRed = false;
	let red = false;

	p.on('value', (value) => {
		value = denoise.step(value);
		const base = baseLine.step(value);
		const diff = value - base;

		if (diff > 80) red = true;
		if (diff < 50) red = false;

		if (!lastRed && red) electricityMeter.emit('consumed', WHPERPULSE);

		lastRed = red;
	});
});

// Calc power
let lastPulse;
electricityMeter.on('consumed', (energy) => {
	const now = Date.now();
	if (lastPulse) {
		const diff = now - lastPulse;
		const pwr = 3600000 * energy / diff;
		electricityMeter.emit('power', pwr);
	}
	lastPulse = now;
});

// Calc total energy
const localStorage = require('../_lib/localStorage.js');
if (!localStorage.totalEnergy) localStorage.totalEnergy = 0;
if (!localStorage.window24h) localStorage.window24h = [];
electricityMeter.on('consumed', (energy) => {
	localStorage.totalEnergy += energy;
	electricityMeter.emit('totalEnergy', localStorage.totalEnergy);
});

// Log into syslog
electricityMeter.on('power', (pwr) => console.log(`Power consumption ${pwr}W`));

// Expose consumption onto the bus
module.exports = [
	// Current values from electricity meter
	[require('ftrm-basic/from-event'), {
		output: {
			'consumed': 'home.haj.atf8.sj.electricitymeter.energy_Wh',
			'totalEnergy': 'home.haj.atf8.sj.electricitymeter.energyTotal_Wh',
			'power': 'home.haj.atf8.sj.electricitymeter.power_W'
		},
		bus: electricityMeter
	}],

	// Sliding window for accumulating the consumed energy of the past 24h
	[require('ftrm-basic/sliding-window'), {
		input: 'home.haj.atf8.sj.electricitymeter.energyTotal_Wh',
		output: 'home.haj.atf8.sj.electricitymeter.energy24h_Wh',
		includeValue: (age) => age < 86400000, // 1 day
		calcOutput: (window) => window[0] - window[window.length - 1],
		window: localStorage.window24h
	}]
];
