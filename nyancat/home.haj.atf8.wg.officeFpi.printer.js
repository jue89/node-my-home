const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// Switches:
	// - Homekit
	[require('ftrm-homekit')('Switch'), {
		name: 'printer-switch-homekit',
		input: {'On': `${BASE}.actualOnState`},
		output: {'On': `${BASE}.desiredOnState.switch`},
		displayName: 'Printer'
	}],
	// - Desk Switch
	[require('../_lib/homieSwitch.js'), {
		name: 'printer-switch-homie',
		input: `${BASE}.actualOnState`,
		output: `${BASE}.desiredOnState.switch`,
		hdpClient,
		cpuid: '0e801400164350573032362d',
		btnName: 'BTN3',
		ledName: 'LED3'
	}],
	// - HTTP API
	[require('ftrm-http/server'), {
		name: 'printer-switch-api',
		input: [{
			name: 'printer',
			pipe: `${BASE}.actualOnState`
		}],
		output: [{
			name: 'printer',
			pipe: `${BASE}.desiredOnState.switch`,
			convert: 'boolean'
		}],
		port: 8081,
		index: true
	}],

	// Printer
	// - Relay
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
		powerReadoutInterval: 20 * 1000,
		...secrets.shelly.printer
	}],
	// - Average power
	[require('ftrm-basic/sliding-window'), {
		name: 'printer-avg-power',
		input: `${BASE}.activePower_W`,
		output: `${BASE}.avgActivePower_W`,
		includeValue: (age) => age < (2 * 60 * 1000), // 2 min
		calcOutput: (win) => win.reduce((avg, x) => avg + x, 0) / win.length
	}],

	// Logic
	// - Keep on if the printer is printing
	[require('ftrm-basic/map'), {
		name: 'printer-power',
		input: `${BASE}.avgActivePower_W`,
		output: `${BASE}.desiredOnState.power`,
		map: (pwr) => pwr > 30
	}],
	// - Select on state input
	[require('ftrm-basic/select'), {
		name: 'printer-select',
		input: [
			{pipe: `${BASE}.desiredOnState.switch`, expire: 10 * 60 * 1000, logLevelExpiration: null},
			{pipe: `${BASE}.desiredOnState.power`}
		],
		output: [
			{pipe: `${BASE}.desiredOnState`, throttle: 10 * 60 * 1000}
		],
		weight: 'prio'
	}],
];
