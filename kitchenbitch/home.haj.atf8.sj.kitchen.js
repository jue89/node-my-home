module.exports = [
	// Sensors:
	// - room temperature
	[require('ftrm-sensors/iio'), {
		output: 'home.haj.atf8.sj.kitchen.room.actualTemperature_degC',
		device: 'iio:device0',
		channel: 'in_temp_input',
		interval: 10000
	}],
	// - humidity
	[require('ftrm-sensors/iio'), {
		output: 'home.haj.atf8.sj.kitchen.room.actualHumidity_relPercent',
		device: 'iio:device0',
		channel: 'in_humidityrelative_input',
		interval: 10000
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		output: 'home.haj.atf8.sj.kitchen.radiator.actualTemperature_degC',
		sensorSerial: '10-000802bf5587',
		interval: 10000
	}],
	// - radiator diff temperature
	[require('ftrm-basic/combine'), {
		input: {
			'radiator': 'home.haj.atf8.sj.kitchen.radiator.actualTemperature_degC',
			'room': 'home.haj.atf8.sj.kitchen.room.actualTemperature_degC'
		},
		output: 'home.haj.atf8.sj.kitchen.radiator.actualDiffTemperature_degC',
		combine: (radiator, room) => {
			let diff = radiator - room;
			if (diff < 0) diff = 0;
			return diff;
		}
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		output: 'home.haj.atf8.sj.kitchen.window.open',
		gpio: 27,
		interval: 5 * 60 * 1000
	}],

	// Actors:
	// - radiator valve
	[require('ftrm-gpio/out'), {
		input: [{pipe: 'home.haj.atf8.sj.kitchen.radiator.open', expire: 60000}],
		gpio: 22,
		default: false
	}],

	// Controllers:
	// - room temperature
	[require('ftrm-ctrl/pid'), {
		input: {
			'k_p': {value: 8},
			'k_i': {value: 0.02},
			'k_d': {value: 0},
			'u_min': {value: 0},
			'u_max': {value: 30},
			'actualValue': {pipe: 'home.haj.atf8.sj.kitchen.room.actualTemperature_degC'},
			'desiredValue': {value: 18}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.desiredDiffTemperature_degC'}
		}
	}],
	// - radiator temperature
	[require('ftrm-ctrl/bangbang'), {
		input: {
			'hysteresis': {value: 1},
			'actualValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.actualDiffTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.desiredDiffTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.open'}
		},
		invert: true
	}]
];
