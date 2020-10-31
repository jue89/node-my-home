const linterpol = require('linterpol');

module.exports = [
	// Sensors:
	// - room temperature
	[require('ftrm-sensors/iio'), {
		name: 'room-temp',
		output: 'home.haj.atf8.sj.kitchen.room.actualTemperature_degC',
		device: 'iio:device0',
		channel: 'in_temp_input',
		interval: 10000
	}],
	// - humidity
	[require('ftrm-sensors/iio'), {
		name: 'room-humidity',
		output: 'home.haj.atf8.sj.kitchen.room.actualHumidity_relPercent',
		device: 'iio:device0',
		channel: 'in_humidityrelative_input',
		interval: 10000
	}],
	[require('ftrm-homekit')('HumiditySensor'), {
		name: 'room-humidity-homekit',
		input: [{name: 'CurrentRelativeHumidity', pipe: 'home.haj.atf8.sj.kitchen.room.actualHumidity_relPercent'}],
		displayName: 'Humidity'
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'radiator-temp',
		output: 'home.haj.atf8.sj.kitchen.radiator.actualTemperature_degC',
		sensorSerial: '10-000802bf5587',
		interval: 10000
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		name: 'window-sensor',
		output: [{pipe: 'home.haj.atf8.sj.kitchen.window.open', throttle: 5 * 60 * 1000}],
		gpio: 27,
		interval: 5 * 60 * 1000
	}],
	[require('ftrm-homekit')('ContactSensor'), {
		name: 'window-sensor-homekit',
		input: {'ContactSensorState': 'home.haj.atf8.sj.kitchen.window.open'},
		displayName: 'Window'
	}],

	// Actors:
	// - radiator valve
	[require('ftrm-gpio/out'), {
		name: 'radiator-valve',
		input: [{pipe: 'home.haj.atf8.sj.kitchen.radiator.open', expire: 60000}],
		gpio: 22,
		default: false
	}],

	// Setpoint:
	// - select
	[require('ftrm-basic/select'), {
		name: 'room-setpoint',
		input: [
			{pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.window'},
			{pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.homekit', expire: 3 * 60 * 60 * 1000, logLevelExpiration: null},
			{pipe: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.schedule'},
			{value: 14}
		],
		output: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC',
		weight: 'prio'
	}],
	// - window
	[require('ftrm-basic/map'), {
		name: 'room-setpoint-window',
		input: 'home.haj.atf8.sj.kitchen.window.open',
		output: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.window',
		map: (open) => open ? 10 : undefined
	}],
	// - homekit
	[require('ftrm-homekit')('Thermostat'), {
		name: 'room-setpoint-homekit',
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
		name: 'room-setpoint-scheduler',
		input: [
			'user.jue.present.atf8',
			'user.fpi.present.atf8',
			'home.haj.atf8.sj.kitchen.airplay.playing'
		],
		output: 'home.haj.atf8.sj.kitchen.room.desiredTemperature_degC.schedule',
		interval: 60000 * 5,
		schedule: (now, jue, fpi, airplay) => {
			if (airplay) return 18;
			const tempNight = (jue || fpi) ? 15 : 12;
			const tempDay = (jue || fpi) ? 17 : 15;
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
		name: 'room-ctrl',
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
		name: 'radiator-setpoint',
		input: {
			'actual': 'home.haj.atf8.sj.kitchen.room.actualTemperature_degC',
			'desiredDiff': 'home.haj.atf8.sj.kitchen.radiator.desiredDiffTemperature_degC'
		},
		output: 'home.haj.atf8.sj.kitchen.radiator.desiredTemperature_degC',
		combine: (actual, diff) => {
			// If the controller requests no diff temperatur,
			// make sure the radiator is turned off -> 6
			if (diff === 0) return 6;
			else return actual + diff;
		}
	}],
	// - radiator temperature
	[require('ftrm-ctrl/bangbang'), {
		name: 'radiator-ctrl',
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
