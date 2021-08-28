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
	// - turn off if the PC isn't in use anymore
	[require('ftrm-basic/edge-detection'), {
		name: 'desk-lamp-inuse-off',
		input: 'home.haj.atf8.wg.officeJue.pcJue.in-use',
		output: `${BASE}.deskLamp.desiredOnState`,
		detectors: [
			{match: 'falling-edge', output: false}
		]
	}],
];
