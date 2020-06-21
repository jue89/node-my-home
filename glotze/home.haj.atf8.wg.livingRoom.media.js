const BASE = __filename.slice(__dirname.length + 1, -3);

const YamahaAVReceiver = require('yamaha-nodejs');

module.exports = [
	// AV Receiver: Shelly
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

	// AV Receiver: Homekit
	[require('ftrm-homekit')('Switch'), {
		name: 'avReceiver-homekit',
		input: { 'On': `${BASE}.avReceiver.actualOnState` },
		output: { 'On': `${BASE}.avReceiver.desiredOnState` },
		displayName: 'AV Receiver'
	}],

	// AV Receiver: API
	[require('ftrm-basic/generic'), {
		name: 'avReceiver',
		input: {
			input: `${BASE}.avReceiver.desiredMainInput`
		},
		factory: (i, o, log) => {
			const av = new YamahaAVReceiver('t-yamaha.lan.13pm.eu');
			const cmd = (cmd, args) => av[cmd].apply(av, args).catch((err) => log.error(err));
			i.input.on('update', (input) => cmd('setMainInputTo', [input]));
		}
	}],

	// TV: Shelly
	[require('../_lib/shellyPlug.js'), {
		name: 'tv-shelly',
		input: {
			'Relay': `${BASE}.tv.desiredOnState`
		},
		output: {
			'Relay': `${BASE}.tv.actualOnState`,
			'Power': `${BASE}.tv.power_W`,
			'ApparentPower': `${BASE}.tv.apparentPower_VA`,
			'ReactivePower': `${BASE}.tv.reactivePower_var`
		},
		host: 't-shelly-042.lan.13pm.eu',
		readbackInterval: 5 * 60 * 1000,
		powerReadoutInterval: 2 * 60 * 1000
	}],

	// TV: Homekit
	[require('ftrm-homekit')('Switch'), {
		name: 'tv-homekit',
		input: { 'On': `${BASE}.tv.actualOnState` },
		output: { 'On': `${BASE}.tv.desiredOnState` },
		displayName: 'TV'
	}]
]
