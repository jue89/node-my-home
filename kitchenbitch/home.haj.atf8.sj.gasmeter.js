const EventEmitter = require('events')
const Poll = require('../_lib/poll.js');

const LITERPERPULSE = 10;

// Event emitter for pluses
const gasMeter = new EventEmitter();

// Search for the red dot
const p = new Poll('/sys/bus/iio/devices/iio:device0/in_voltage0_raw', 50);
const base = 2500;
let red = false;
let lastRed = false;
p.on('value', (value) => {
	const diff = value - base;

	if (diff < -800) red = true;
	if (diff > -400) red = false;

	if (!lastRed && red) gasMeter.emit('consumed', LITERPERPULSE);

	lastRed = red;
});

// Log into syslog
gasMeter.on('consumed', (vol) => console.log(`Consumed ${vol}L`));

// Expose consumption onto the bus
module.exports = [require('ftrm-basic/from-event'), {
	output: { 'consumed': 'home.haj.atf8.sj.gasmeter.literConsumed' },
	bus: gasMeter
}];
