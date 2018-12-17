const linterpol = require('linterpol');

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
	[require('ftrm-homekit')('HumiditySensor'), {
		input: [{name: 'CurrentRelativeHumidity', pipe: 'home.haj.atf8.sj.kitchen.room.actualHumidity_relPercent'}],
		displayName: 'Humidity'
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		output: 'home.haj.atf8.sj.kitchen.radiator.actualTemperature_degC',
		sensorSerial: '10-000802bf5587',
		interval: 10000
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		output: [{pipe: 'home.haj.atf8.sj.kitchen.window.open', throttle: 5 * 60 * 1000}],
		gpio: 27,
		interval: 5 * 60 * 1000
	}],
	[require('ftrm-homekit')('ContactSensor'), {
		input: {'ContactSensorState': 'home.haj.atf8.sj.kitchen.window.open'},
		displayName: 'Window'
	}],

	// Actors:
	// - radiator valve
	[require('ftrm-gpio/out'), {
		input: [{pipe: 'home.haj.atf8.sj.kitchen.radiator.open', expire: 60000}],
		gpio: 22,
		default: false
	}],

	// Setpoint:
	// - select
	[require('ftrm-basic/select'), {
		input: [
			{pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.window'},
			{pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.homekit', expire: 3 * 60 * 60 * 1000},
			{pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.schedule'},
			{value: 14}
		],
		output: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC',
		weight: 'prio'
	}],
	// - window
	[require('ftrm-basic/map'), {
		input: 'home.haj.atf8.sj.kitchen.window.open',
		output: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.window',
		map: (open) => open ? 10 : undefined
	}],
	// - homekit
	[require('ftrm-homekit')('Thermostat'), {
		input: [
			{name: 'CurrentTemperature', pipe: 'home.haj.atf8.sj.kitchen.room.actualTemperature_degC'},
			{name: 'CurrentHeatingCoolingState', pipe: 'home.haj.atf8.sj.kitchen.radiator.open'},
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC'}
		],
		output: [
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.homekit'},
			{name: 'TargetHeatingCoolingState', value: 3},
			{name: 'TemperatureDisplayUnits', value: 0}
		],
		displayName: 'Heating'
	}],
	// - schedule
	[require('ftrm-basic/scheduler'), {
		input: [
			'user.jue.present.atf8',
			'user.steffen.present.atf8',
			'home.haj.atf8.sj.kitchen.airplay.playing'
		],
		output: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.schedule',
		interval: 60000 * 5,
		schedule: (now, jue, steffen, airplay) => {
			if (airplay) return 18;
			const tempNight = (jue || steffen) ? 15 : 12;
			const tempDay = (jue || steffen) ? 17 : 15;
			const time = now.m / 60 + now.h;
			return linterpol(time, [
				[08, tempNight],
				[10, tempDay],
				[21, tempDay],
				[23, tempNight]
			], 24);
		}
	}],

	// Controllers:
	// - room temperature
	[require('ftrm-ctrl/pid'), {
		input: {
			'k_p': {value: 8},
			'k_i': {value: 0.02},
			'k_d': {value: 0},
			'u_min': {value: 0},
			'u_max': {value: 30, pipe: 'home.haj.atf8.sj.maxDesiredDiffTemperature_degC'},
			'actualValue': {pipe: 'home.haj.atf8.sj.kitchen.room.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.desiredDiffTemperature_degC'}
		}
	}],
	[require('ftrm-basic/combine'), {
		input: {
			'actual': 'home.haj.atf8.sj.kitchen.radiator.actualTemperature_degC',
			'desiredDiff': 'home.haj.atf8.sj.kitchen.radiator.desiredDiffTemperature_degC'
		},
		output: 'home.haj.atf8.sj.kitchen.radiator.desiredTemperature_degC',
		combine: (radiator, room) => {
			let diff = radiator - room;
			if (diff < 0) diff = 0;
			return diff;
		}
	],
	// - radiator temperature
	[require('ftrm-ctrl/bangbang'), {
		input: {
			'hysteresis': {value: 1},
			'actualValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.kitchen.radiator.open'}
		},
		invert: true
	}]
];
