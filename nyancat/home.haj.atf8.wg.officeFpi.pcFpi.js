const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// Laptop is connected with wired home network
	[require('ftrm-tracking/pcap'), {
		name: 'fpi-pcap-laptopWired',
		output: [ {name: 'online', pipe: 'user.fpi.devices.laptopWired.online', throttle: 3 * 60 * 1000} ],
		mac: secrets.networkDevices.fpiLaptopWired.mac,
		timeSlot: 2000,
		windowSize: 300, // 2000ms * 300 = 600000ms = 10min
		threshold: 0
	}],

	// Tablet is connected with wired home network
	[require('ftrm-tracking/pcap'), {
		name: 'fpi-pcap-tabletWired',
		output: [ {name: 'online', pipe: 'user.fpi.devices.tabletWired.online', throttle: 3 * 60 * 1000} ],
		mac: secrets.networkDevices.fpiTabletWired.mac,
		timeSlot: 2000,
		windowSize: 300, // 2000ms * 300 = 600000ms = 10min
		threshold: 0
	}],

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
		...secrets.shelly.pcFpiMaster
	}],

	// Master: Power switch
	[require('ftrm-homekit')('Switch'), {
		name: 'pc-switch-homekit',
		input: { 'On': `${BASE}.master.actualOnState` },
		output: { 'On': `${BASE}.master.desiredOnState.switch` },
		displayName: 'Peter'
	}],
	[require('../_lib/homieSwitch.js'), {
		name: 'pc-switch-homie',
		input: `${BASE}.master.actualOnState`,
		output: `${BASE}.master.desiredOnState.switch`,
		hdpClient,
		cpuid: '0e801400164350573032362d',
		btnName: 'BTN2',
		ledName: 'LED2'
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
			{pipe: `${BASE}.master.desiredOnState.power`, expire: 5 * 60 * 1000},
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
		...secrets.shelly.pcFpiSlave
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
			{pipe: `${BASE}.dock.actualOnState`},
			{pipe: `user.fpi.devices.laptopWired.online`},
			{pipe: `user.fpi.devices.tabletWired.online`},
			{pipe: `${BASE}.slave.desiredOnState.override`}
		],
		output: [
			{pipe: `${BASE}.slave.desiredOnState`, throttle: 10 * 60 * 1000}
		],
		combineExpiredInputs: true,
		combine: (masterOn, dockOn, laptopOnline, tabletOnline, override) => {
			return override || masterOn || dockOn || laptopOnline || tabletOnline || false;
		}
	}],

	// Workstation online
	[require('ftrm-basic/map'), {
		name: 'workstation-in-use',
		input: `${BASE}.slave.activePower_W`,
		output: `${BASE}.inUse`,
		map: (x) => x > 10 // W
	}],

	// Dock: Relay
	[require('../_lib/shellyPlug.js'), {
		name: 'dock-relay',
		input: {
			'Relay': `${BASE}.dock.desiredOnState`
		},
		output: {
			'Relay': `${BASE}.dock.actualOnState`,
			'Power': `${BASE}.dock.activePower_W`,
			'ApparentPower': `${BASE}.dock.apparentPower_VA`,
			'ReactivePower': `${BASE}.dock.reactivePower_var`
		},
		powerReadoutInterval: 20 * 1000,
		...secrets.shelly.fpiDock
	}],

	// Dock: Switches
	[require('ftrm-homekit')('Switch'), {
		name: 'dock-switch-homekit',
		input: { 'On': `${BASE}.dock.actualOnState` },
		output: { 'On': `${BASE}.dock.desiredOnState` },
		displayName: 'PC Override'
	}],
	[require('../_lib/homieSwitch.js'), {
		name: 'dock-switch-homie',
		input: `${BASE}.dock.actualOnState`,
		output: `${BASE}.dock.desiredOnState`,
		hdpClient,
		cpuid: '0e801400164350573032362d',
		btnName: 'BTN1',
		ledName: 'LED1'
	}],

	// Docker: Power analysis
	[require('ftrm-basic/sliding-window'), {
		input: `${BASE}.dock.activePower_W`,
		output: `${BASE}.dock.activePowerAvg_W`,
		includeValue: (age, index) => age < 3 * 60 * 1000, // Keep all values of 3 minutes
		calcOutput: (window) => window.reduce((avg, value) => svg + value / window.length, 0)
	}],
	[require('ftrm-basic/edge-detection'), {
		input: `${BASE}.dock.activePowerAvg_W`,
		output: `${BASE}.dock.desiredOnState`,
		detectors: [{
			match: (from, to) => from > 8 && to < 8, // Consuming less than 8W
			output: false                            // -> Turn off
		}]
	}]
];
