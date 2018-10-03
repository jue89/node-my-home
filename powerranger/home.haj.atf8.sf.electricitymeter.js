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
	
	let lastPulse;
	let lastRed = false;
	let red = false;

	p.on('value', (value) => {
		value = denoise.step(value);
		const base = baseLine.step(value);
		const diff = value - base;

		if (diff > 80) red = true;
		if (diff < 50) red = false;

		if (!lastRed && red) {
			// Emit consumed energy
			electricityMeter.emit('consumed', WHPERPULSE);

			// Emit current power consumption
			const now = Date.now();
			if (lastPulse) {
				const diff = now - lastPulse;
				const pwr = 3600000 * WHPERPULSE / diff;
				electricityMeter.emit('power', pwr);
			}
			lastPulse = now
		}

		lastRed = red;
	});
});

// Log into syslog
electricityMeter.on('consumed', (vol) => console.log(`Consumed ${vol}Wh`));
electricityMeter.on('power', (pwr) => console.log(`Power consumption ${pwr}W`));

// Expose consumption onto the bus
module.exports = [require('ftrm-basic/from-event'), {
	output: {
		'consumed': 'home.haj.atf8.sj.electricitymeter.energy_Wh',
		'power': 'home.haj.atf8.sj.electricitymeter.power_W'
	},
	bus: electricityMeter
}];
