const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// Master: Relay
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

	// Master: Power switch
	[require('ftrm-homekit')('Switch'), {
		name: 'pc-switch-homekit',
		input: { 'On': `${BASE}.master.actualOnState` },
		output: { 'On': `${BASE}.master.desiredOnState.switch` },
		displayName: 'PC'
	}],
	[require('ftrm-gpio/switch'), {
		name: 'pc-switch-gpio',
		input: `${BASE}.master.actualOnState`,
		output: `${BASE}.master.desiredOnState.switch`,
		onGpio: 23,
		ledGpio: 24
	}],

	// Master: Power based switch: Keep the relay on as long the PC is powered on
	[require('ftrm-basic/map'), {
		name: 'pc-switch-power',
		input: `${BASE}.master.activePower_W`,
		output: `${BASE}.master.desiredOnState.power`,
		// true -> Keep power on; undefined -> Ask someone else ...
		map: (pwr) => (pwr > 15) ? true : undefined
	}],

	// Master: Override switch: Keeps the PC powered on - no matter whats going on
	[require('ftrm-homekit')('Switch'), {
		name: 'pc-switch-override',
		output: { 'On': `${BASE}.master.desiredOnState.override` },
		displayName: 'PC Override'
	}],

	// Master: Select the power on state based
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

	// Slave: Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'periph-relay',
		input: {
			'Relay': `${BASE}.slave.desiredOnState`
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

	// Slave: Override switch: Keeps the PC powered on - no matter whats going on
	[require('ftrm-homekit')('Switch'), {
		name: 'periph-switch-override',
		output: { 'On': `${BASE}.slave.desiredOnState.override` },
		displayName: 'PC Periph Override'
	}],

	// Slave: Select the power on state based
	[require('ftrm-basic/combine'), {
		name: 'periph-switch',
		input: [
			{pipe: `${BASE}.master.actualOnState`},
			{pipe: `user.jue.present.atf8`},
			{pipe: `${BASE}.slave.desiredOnState.override`}
		],
		output: [
			{pipe: `${BASE}.slave.desiredOnState`, throttle: 10 * 60 * 1000}
		],
		combineExpiredInputs: true,
		combine: (masterOnState, juePresent, override) => override || (masterOnState && juePresent) || false
	}],

	// Workstation online
	[require('ftrm-basic/map'), {
		name: 'workstation-in-use',
		input: `${BASE}.slave.activePower_W`,
		output: `${BASE}.inUse`,
		map: (x) => x > 30 // W
	}],
];
