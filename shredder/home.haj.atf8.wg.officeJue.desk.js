const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// Desk lamp:
	// - relay
	[require('../_lib/homieRelay.js'), {
		name: 'desk-lamp-relay',
		input: `${BASE}.deskLamp.desiredOnState`,
		output: `${BASE}.deskLamp.actualOnState`,
		hdpClient,
		cpuid: '0880260011434b5237363620',
		relayName: 'CH2'
	}],
	// - switch at the desk
	[require('../_lib/homieSwitch.js'), {
		name: 'desk-lamp-switch',
		input: `${BASE}.deskLamp.actualOnState`,
		output: `${BASE}.deskLamp.desiredOnState`,
		hdpClient,
		cpuid: '37ffd3054d53313911752243',
		btnName: 'BTN2',
		ledName: 'LED2',
		brightnessOff: [128, 0, 0],
		brightnessOn: [0, 255, 0],
	}],
	// - Homekit switch
	[require('ftrm-homekit')('Switch'), {
		name: 'desk-lamp-homekit',
		input: {'On': `${BASE}.deskLamp.actualOnState`},
		output: {'On': `${BASE}.deskLamp.desiredOnState`},
		displayName: 'Desk Lamp'
	}],
	// - turn off if the PC isn't in use anymore
	[require('ftrm-basic/edge-detection'), {
		name: 'desk-lamp-inuse-off',
		input: 'home.haj.atf8.wg.officeJue.pcJue.inUse',
		output: `${BASE}.deskLamp.desiredOnState`,
		detectors: [
			{match: (from, to) => from === true && to === false, delay: 30 * 1000, output: false}
		]
	}],

	// Video lights
	// - relay
	[require('../_lib/homieRelay.js'), {
		name: 'desk-lamp-relay',
		input: `${BASE}.keyLight.desiredOnState`,
		output: `${BASE}.keyLight.actualOnState`,
		hdpClient,
		cpuid: '0880260011434b5237363620',
		relayName: 'CH0'
	}],
	[require('../_lib/homieRelay.js'), {
		name: 'desk-lamp-relay',
		input: `${BASE}.fillLight.desiredOnState`,
		output: `${BASE}.fillLight.actualOnState`,
		hdpClient,
		cpuid: '0880260011434b5237363620',
		relayName: 'CH1'
	}],

	// Printer
	[require('../_lib/homieSwitch.js'), {
		name: 'printer-switch',
		input: `home.haj.atf8.wg.officeFpi.printer.actualOnState`,
		output: `home.haj.atf8.wg.officeFpi.printer.desiredOnState.switch`,
		hdpClient,
		cpuid: '37ffd3054d53313911752243',
		btnName: 'BTN4',
		ledName: 'LED4',
		brightnessOff: [128, 0, 0],
		brightnessOn: [0, 255, 0],
	}],
];
