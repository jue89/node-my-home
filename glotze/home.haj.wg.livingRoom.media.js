const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// Shelly of the AV receiver
	[require('../_lib/shellyPlug.js'), {
		name: 'avReceiver-shelly',
		input: {
			'Relay': `${BASE}.avReceiver.desiredOnState`
		},
		output: {
			'Relay': `${BASE}.avReceiver.actualOnState`,
			'Power': `${BASE}.avReceiver.power_W`,
			'ApparentPower': `${BASE}.avReceiver.apparentPower_VA`,
			'ReactivePower': `${BASE}.avReceiver.reactivePower_var`
		},
		host: 't-shelly-031.lan.13pm.eu',
		readbackInterval: 5 * 60 * 1000,
		powerReadoutInterval: 2 * 60 * 1000
	}],

	// Homekit interface
	[require('ftrm-homekit')('Switch'), {
		name: 'avReceiver-homekit',
		input: { 'On': `${BASE}.avReceiver.actualOnState` },
		output: { 'On': `${BASE}.avReceiver.desiredOnState` },
		displayName: 'AV Receiver'
	}]
]
