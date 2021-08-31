const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// State switch whether the PC is in use:
	// - Homie switch at the door
	[require('../_lib/homieSwitch.js'), {
		name: 'inuse-switch-door',
		input: `${BASE}.inUse`,
		output: `${BASE}.inUse`,
		hdpClient,
		cpuid: '0100260011434b5237363620',
		btnName: 'BTN1',
		ledName: 'LED1'
	}],
	// - Homie switch at the desk
	[require('../_lib/homieSwitch.js'), {
		name: 'inuse-switch-desk',
		input: `${BASE}.inUse`,
		output: `${BASE}.inUse`,
		hdpClient,
		cpuid: '37ffd3054d53313911752243',
		btnName: 'BTN3',
		ledName: 'LED3',
		brightnessOff: [128, 0, 0],
		brightnessOn: [0, 255, 0],
	}],
	// - Homekit switch
	[require('ftrm-homekit')('Switch'), {
		name: 'inuse-switch-homekit',
		input: { 'On': `${BASE}.inUse` },
		output: { 'On': `${BASE}.inUse` },
		displayName: 'PC'
	}],
	// - Turn off once leaving the flat
	[require('ftrm-basic/edge-detection'), {
		name: 'inuse-edge-leaving',
		input: 'user.jue.present.atf8',
		output: `${BASE}.inUse`,
		detectors: [
			{match: 'falling-edge', output: false}
		]
	}],
	// - Keep track of the PC relay
	[require('ftrm-basic/edge-detection'), {
		name: 'inuse-edge-pc',
		input: `${BASE}.master.actualOnState`,
		output: `${BASE}.inUse`,
		detectors: [
			// - Read back last in-use state on start by looking at the PC relay
			{match: (from, to) => from === undefined && to === true, output: true},
			{match: (from, to) => from === undefined && to === false, output: false},
			// - Turn of with the PC relay turning off
			{match: (from, to) => from === true && to === false, output: false},
		]
	}],

	// PC
	// - Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'pc-relay',
		input: {
			'Relay': `${BASE}.master.desiredOnState`
		},
		output: {
			'Relay': `${BASE}.master.actualOnState`,
			'Power': `${BASE}.master.activePower_W`,
			'ApparentPower': `${BASE}.master.apparentPower_VA`,
			'ReactivePower': `${BASE}.master.reactivePower_var`
		},
		powerReadoutInterval: 20 * 1000,
		...secrets.shelly.pcJueMaster
	}],
	// - Keep on if it consumes power
	[require('ftrm-basic/map'), {
		name: 'pc-switch-power',
		input: `${BASE}.master.activePower_W`,
		output: `${BASE}.master.desiredOnState.power`,
		// true -> Keep power on; undefined -> Ask someone else ...
		map: (pwr) => (pwr > 30) ? true : undefined
	}],
	// - Turn on if in-use switches on
	[require('ftrm-basic/edge-detection'), {
		name: 'pc-inuse-edge',
		input: `${BASE}.inUse`,
		output: `${BASE}.master.desiredOnState.switch`,
		detectors: [
			{match: 'rising-edge', output: true}
		]
	}],
	// - Override homekit button
	[require('ftrm-homekit')('Switch'), {
		name: 'pc-switch-override',
		output: { 'On': `${BASE}.master.desiredOnState.override` },
		displayName: 'PC Override'
	}],
	// - Find the desired on state
	[require('ftrm-basic/select'), {
		name: 'pc-switch',
		input: [
			{pipe: `${BASE}.master.desiredOnState.switch`, expire: 50 * 1000, logLevelExpiration: null},
			{pipe: `${BASE}.master.desiredOnState.power`, expire: 90 * 1000},
			{pipe: `${BASE}.master.desiredOnState.override`},
			{value: false}
		],
		output: [
			{pipe: `${BASE}.master.desiredOnState`, throttle: 10 * 60 * 1000}
		],
		weight: 'prio'
	}],

	// Peripheral relay
	[require('../_lib/shellyPlug.js'), {
		name: 'periph-relay',
		input: {
			'Relay': `${BASE}.inUse`
		},
		output: {
			'Relay': `${BASE}.slave.actualOnState`,
			'Power': `${BASE}.slave.activePower_W`,
			'ApparentPower': `${BASE}.slave.apparentPower_VA`,
			'ReactivePower': `${BASE}.slave.reactivePower_var`
		},
		powerReadoutInterval: 20 * 1000,
		...secrets.shelly.pcJueSlave
	}],
];
