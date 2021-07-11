const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
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

	[require('../_lib/homieRelay.js'), {
		name: 'desk-lamp-relay',
		input: `${BASE}.deskLamp.desiredOnState`,
		output: `${BASE}.deskLamp.actualOnState`,
		hdpClient,
                cpuid: '0880260011434b5237363620',
		relayName: 'CH2'
	}],
];
