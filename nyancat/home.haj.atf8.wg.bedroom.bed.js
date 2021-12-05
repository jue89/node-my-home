const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// LED RGB Homekit
	[require('ftrm-homekit')('Lightbulb'), {
		name: 'bed-color-homekit',
		input: {
			'On': `${BASE}.color.onState`,
			'Hue': `${BASE}.color.hue`,
			'Saturation': `${BASE}.color.sat`,
			'Brightness': `${BASE}.color.brightness`
		},
		output: {
			'On': `${BASE}.color.onState`,
			'Hue': `${BASE}.color.hue`,
			'Saturation': `${BASE}.color.sat`,
			'Brightness': `${BASE}.color.brightness`
		},
		displayName: 'Bed Color'
	}],

	// LED RGB
	[require('../_lib/homieRGB.js'), {
		name: 'bed-color',
		input: {
			'on': `${BASE}.color.onState`,
			'h': `${BASE}.color.hue`,
			's': `${BASE}.color.sat`,
			'v': `${BASE}.color.brightness`
		},
		hdpClient,
		cpuid: '00001600164350573032362d',
		ledName: 'LEDRGB'
	}],

	// LED RGB Homekit
	[require('ftrm-homekit')('Lightbulb'), {
		name: 'bed-color-homekit',
		input: {
			'On': `${BASE}.light.onState`,
			'Brightness': `${BASE}.light.brightness`
		},
		output: {
			'On': `${BASE}.light.onState`,
			'Brightness': `${BASE}.light.brightness`
		},
		displayName: 'Bed Light'
	}],

	// LED RGB
	[require('../_lib/homieRGB.js'), {
		name: 'bed-color',
		input: {
			'on': `${BASE}.light.onState`,
			'v': `${BASE}.light.brightness`
		},
		hdpClient,
		cpuid: '00001600164350573032362d',
		ledName: 'LEDW'
	}],
];