const BASE = __filename.slice(__dirname.length + 1, -3);
const secrets = require('./secrets.json');

module.exports = [
	// Homekit Switch
	[require('ftrm-homekit')('Switch'), {
		name: 'ceilingLight-homekit',
		input: { 'On': `${BASE}.actualOnState` },
		output: { 'On': `${BASE}.desiredOnState` },
		displayName: 'Ceiling Light'
	}],

	// Shelly Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'ceilingLight-shelly',
		input: {
			'Relay': `${BASE}.desiredOnState`
		},
		output: {
			'Relay': {pipe: `${BASE}.actualOnState`, throttle: 10 * 60 * 1000}
		},
		host: '100.64.0.5',
		user: secrets.shelly.user,
		password: secrets.shelly.password,
		readbackInterval: 5 * 1000
	}]
];
