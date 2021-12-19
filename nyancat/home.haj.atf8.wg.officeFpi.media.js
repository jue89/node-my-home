const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// Switches:
	// - Homekit
	[require('ftrm-homekit')('Switch'), {
		name: 'avReceiver-switch-homekit',
		input: {'On': `${BASE}.avReceiver.actualOnState`},
		output: {'On': `${BASE}.avReceiver.desiredOnState`},
		displayName: 'AV Receiver'
	}],

	// AV Receiver Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'avReceiver-relay',
		input: {
			'Relay': `${BASE}.avReceiver.desiredOnState`
		},
		output: {
			'Relay': `${BASE}.avReceiver.actualOnState`,
			'Power': `${BASE}.avReceiver.activePower_W`,
			'ApparentPower': `${BASE}.avReceiver.apparentPower_VA`,
			'ReactivePower': `${BASE}.avReceiver.reactivePower_var`
		},
		readbackInterval: 60 * 1000,
		powerReadoutInterval: 20 * 1000,
		...secrets.shelly.fpiAVReceiver
	}],
];
