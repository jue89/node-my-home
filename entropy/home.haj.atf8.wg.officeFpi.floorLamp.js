const BASE = __filename.slice(__dirname.length + 1, -3);
const secrets = require('../secrets.json');

module.exports = [
	// Homekit Switch
	[require('ftrm-homekit')('Switch'), {
		name: 'floorLamp-homekit',
		input: { 'On': `${BASE}.actualOnState` },
		output: { 'On': `${BASE}.desiredOnState` },
		displayName: 'Stehlampe'
	}],

	// Shelly Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'floorLamp-shelly',
		input: {
			'Relay': `${BASE}.desiredOnState`
		},
		output: {
			'Relay': {pipe: `${BASE}.actualOnState`, throttle: 10 * 60 * 1000}
		},
		readbackInterval: 60 * 1000,
		...secrets.shelly.fpiFloorLamp
	}]
];
