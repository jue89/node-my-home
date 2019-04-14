const linterpol = require('linterpol');

module.exports = [
	// Sensors:
	// - room temperature
	[require('ftrm-sensors/w1therm'), {
		output: 'home.haj.atf8.sj.leo.room.actualTemperature_degC',
		sensorSerial: '28-00000751b7c5',
		interval: 20000
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		output: 'home.haj.atf8.sj.leo.radiator.actualTemperature_degC',
		sensorSerial: '10-000802bfaeec',
		interval: 20000
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		output: 'home.haj.atf8.sj.leo.window.open',
		gpio: 27,
		interval: 5 * 60 * 1000
	}],
	[require('ftrm-homekit')('ContactSensor'), {
		input: {'ContactSensorState': 'home.haj.atf8.sj.leo.window.open'},
		displayName: 'Window'
	}],

	// Actors:
	// - radiator valve
	[require('ftrm-gpio/out'), {
		input: [{pipe: 'home.haj.atf8.sj.leo.radiator.open', expire: 60000}],
		gpio: 22,
		default: false
	}],

	// Setpoint:
	// - select
	[require('ftrm-basic/select'), {
		input: [
			{pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC.window'},
			{pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC.manual', expire: 18 * 60 * 60 * 1000},
			{pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC.schedule'},
			{value: 12}
		],
		output: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC',
		weight: 'prio'
	}],
	// - window
	[require('ftrm-basic/map'), {
		input: 'home.haj.atf8.sj.leo.window.open',
		output: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC.window',
		map: (open) => open ? 10 : undefined
	}],
	// - manual
	[require('ftrm-homekit')('Thermostat'), {
		input: [
			{name: 'CurrentTemperature', pipe: 'home.haj.atf8.sj.leo.room.actualTemperature_degC'},
			{name: 'CurrentHeatingCoolingState', pipe: 'home.haj.atf8.sj.leo.radiator.open'},
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC'}
		],
		output: [
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC.manual'},
			{name: 'TargetHeatingCoolingState', value: 3},
			{name: 'TemperatureDisplayUnits', value: 0}
		],
		displayName: 'Heating'
	}],
	[require('ftrm-http/server'), {
		input: [
			{name: 'radiator/actualTemperature_degC', pipe: 'home.haj.atf8.sj.leo.radiator.actualTemperature_degC'},
			{name: 'radiator/open', pipe: 'home.haj.atf8.sj.leo.radiator.open'},
			{name: 'room/actualTemperature_degC', pipe: 'home.haj.atf8.sj.leo.room.actualTemperature_degC'},
			{name: 'room/desiredTemperature_degC', pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC'}
		],
		output: [
			{name: 'room/desiredTemperature_degC', pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC.manual', convert: 'float'}
		],
		port: 8080,
		index: true
	}],
	// - schedule
	[require('ftrm-basic/scheduler'), {
		input: [],
		output: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC.schedule',
		interval: 60000 * 5,
		schedule: (now) => 12
	}],

	// Controllers:
	// - room temperature
	[require('ftrm-ctrl/pid'), {
		input: {
			'k_p': {value: 4},
			'k_i': {value: 0.02},
			'k_d': {value: 0},
			'u_min': {value: 0},
			'u_max': {value: 30, pipe: 'home.haj.atf8.sj.maxDesiredDiffTemperature_degC'},
			'actualValue': {pipe: 'home.haj.atf8.sj.leo.room.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.leo.room.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.leo.radiator.desiredDiffTemperature_degC'}
		}
	}],
	[require('ftrm-basic/combine'), {
		input: {
			'actual': 'home.haj.atf8.sj.leo.room.actualTemperature_degC',
			'desiredDiff': 'home.haj.atf8.sj.leo.radiator.desiredDiffTemperature_degC'
		},
		output: 'home.haj.atf8.sj.leo.radiator.desiredTemperature_degC',
		combine: (actual, diff) => {
			// If the controller requests no diff temperatur,
			// make sure the radiator is turned off -> 6
			if (diff === 0) return 6;
			else return actual + diff;
		}
	}],
	// - radiator temperature
	[require('ftrm-ctrl/bangbang'), {
		input: {
			'hysteresis': {value: 1},
			'actualValue': {pipe: 'home.haj.atf8.sj.leo.radiator.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.leo.radiator.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.leo.radiator.open'}
		},
		invert: true
	}]
];

