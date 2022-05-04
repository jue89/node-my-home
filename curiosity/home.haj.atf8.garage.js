const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// Ceiling light Homekit switch
	[require('ftrm-homekit')('Switch'), {
		name: 'garage-ceilingLight',
		input: {'On': `${BASE}.ceilingLight.actualOnState`},
		output: {'On': `${BASE}.ceilingLight.desiredOnState`},
		displayName: 'Ceiling Light'
	}],

	// Zero charging Homekit switch
	[require('ftrm-homekit')('Switch'), {
		name: 'garage-zero',
		input: {'On': `${BASE}.zero.actualOnState`},
		output: {'On': `${BASE}.zero.desiredOnState`},
		displayName: 'Zero Charging'
	}],

	[require('ftrm-homekit')('TemperatureSensor'), {
		name: 'garage-temp',
		input: [{name: 'CurrentTemperature', pipe: `${BASE}.room.actualTemperature_degC`}],
		displayName: 'Temperature'
	}],
];
