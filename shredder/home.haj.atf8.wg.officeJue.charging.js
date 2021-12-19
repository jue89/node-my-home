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
	[require('ftrm-basic/edge-detection'), {
		name: 'charging-reset',
		input: `${BASE}.actualOnState`,
		output: `${BASE}.desiredOnState`,
		retriggerDetectors: true,
		detectors: [{
			match: (from, to) => from !== true && to === true,
			output: false,
			delay: 24 * 3600 * 1000
		}],
	}],

	// Relay
	[require('../_lib/homieRelay.js'), {
		name: 'charging-relay',
		input: `${BASE}.desiredOnState`,
		output: `${BASE}.actualOnState`,
		hdpClient,
		cpuid: '03001f000c434b5237363620',
		relayName: 'CH3'
	}],
];
