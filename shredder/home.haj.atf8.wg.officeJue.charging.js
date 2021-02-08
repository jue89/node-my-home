const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// Homekit Switch
	[require('ftrm-homekit')('Switch'), {
		name: 'charging-switch-homekit',
		input: {'On': `${BASE}.actualOnState`},
		output: {'On': `${BASE}.desiredOnState.homekit`},
		displayName: 'Charging Station'
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
			'Relay': `${BASE}.actualOnState`,
			'Power': `${BASE}.activePower_W`,
			'ApparentPower': `${BASE}.apparentPower_VA`,
			'ReactivePower': `${BASE}.reactivePower_var`
		},
		readbackInterval: 60 * 1000,
		powerReadoutInterval: 60 * 1000,
		...secrets.shelly.charging
	}]
];
