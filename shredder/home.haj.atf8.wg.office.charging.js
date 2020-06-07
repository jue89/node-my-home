const secrets = require('./secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// Homekit Switch
	[require('ftrm-homekit')('Switch'), {
		name: 'charging-switch-homekit',
		input: { 'On': `${BASE}.actualOnState` },
		output: { 'On': `${BASE}.desiredOnState.homekit` },
		displayName: 'Charging Station'
	}],

	// Default state logic
	[require('ftrm-basic/select'), {
		name: 'charging-switch',
		input: [
			{pipe: `${BASE}.desiredOnState.homekit`, expire: 24 * 3600 * 1000, logLevelExpiration: null},
			{value: false}
		],
		output: [
			{pipe: `${BASE}.desiredOnState`, retransmit: 20 * 60 * 1000}
		],
		weight: 'prio'
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
		host: '100.64.0.4',
		user: secrets.shelly.user,
		password: secrets.shelly.password,
		powerReadoutInterval: 2 * 60 * 1000
	}]
];
