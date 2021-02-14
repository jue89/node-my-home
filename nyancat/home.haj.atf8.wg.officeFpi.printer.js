const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// Homekit Switch
	[require('ftrm-homekit')('Switch'), {
		name: 'printer-switch-homekit',
		input: {'On': `${BASE}.actualOnState`},
		output: {'On': `${BASE}.desiredOnState`},
		displayName: 'Printer'
	}],

	// HTTP API
	[require('ftrm-http/server'), {
		name: 'printer-switch-api',
		input: [{
			name: 'printer',
			pipe: `${BASE}.actualOnState`
		}],
		output: [{
			name: 'printer',
			pipe: `${BASE}.desiredOnState`,
			convert: 'boolean'
		}],
		port: 8081,
		index: true
	}],

	// Default state logic
	[require('../_lib/delayedReset.js'), {
		name: 'printer-reset',
		input: `${BASE}.actualOnState`,
		output: `${BASE}.desiredOnState`,
		delay: 15 * 60 * 1000
	}],

	// Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'printer-relay',
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
		...secrets.shelly.printer
	}]
];
