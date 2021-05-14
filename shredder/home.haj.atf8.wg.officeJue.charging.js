const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// Switch
	[require('ftrm-homekit')('Switch'), {
		name: 'charging-switch-homekit',
		input: {'On': `${BASE}.actualOnState`},
		output: {'On': `${BASE}.desiredOnState`},
		displayName: 'Charging Station'
	}],
	[require('../_lib/homieSwitch.js'), {
		name: 'charging-switch-homie',
		input: `${BASE}.actualOnState`,
		output: `${BASE}.desiredOnState`,
		hdpClient,
		cpuid: '0100260011434b5237363620',
		btnName: 'BTN3',
		ledName: 'LED3'
	}],

	// Default state logic
	[require('../_lib/delayedReset.js'), {
		name: 'charging-reset',
		input: `${BASE}.actualOnState`,
		output: `${BASE}.desiredOnState`,
		delay: 24 * 3600 * 1000
	}],

	// Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'charging-relay',
		input: {
			'Relay': `${BASE}.desiredOnState`
		},
		output: {
			'Relay': `${BASE}.actualOnState`
		},
		readbackInterval: 60 * 1000,
		...secrets.shelly.charging
	}]
];
