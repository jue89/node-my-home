const linterpol = require('linterpol');

module.exports = [
	// Sensors:
	// - room temperature
	[require('ftrm-sensors/w1therm'), {
		output: 'home.haj.atf8.sj.steffen.room.actualTemperature_degC',
		sensorSerial: '28-0000074a8494',
		interval: 20000
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		output: 'home.haj.atf8.sj.steffen.radiator.actualTemperature_degC',
		sensorSerial: '10-000802bf6844',
		interval: 20000
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		output: 'home.haj.atf8.sj.steffen.window.open',
		gpio: 27,
		interval: 5 * 60 * 1000
	}],
	[require('ftrm-homekit')('ContactSensor'), {
		input: {'ContactSensorState': 'home.haj.atf8.sj.steffen.window.open'},
		displayName: 'Window'
	}],

	// Actors:
	// - radiator valve
	[require('ftrm-gpio/out'), {
		input: [{pipe: 'home.haj.atf8.sj.steffen.radiator.open', expire: 60000}],
		gpio: 17,
		default: false
	}],

	// Setpoint:
	// - select
	[require('ftrm-basic/select'), {
		input: [
			{pipe: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC.window'},
			{pipe: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC.homekit', expire: 3 * 60 * 60 * 1000},
			{pipe: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC.schedule'},
			{value: 14}
		],
		output: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC',
		weight: 'prio'
	}],
	// - window
	[require('ftrm-basic/map'), {
		input: 'home.haj.atf8.sj.steffen.window.open',
		output: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC.window',
		map: (open) => open ? 10 : undefined
	}],
	// - homekit
	[require('ftrm-homekit')('Thermostat'), {
		input: [
			{name: 'CurrentTemperature', pipe: 'home.haj.atf8.sj.steffen.room.actualTemperature_degC'},
			{name: 'CurrentHeatingCoolingState', pipe: 'home.haj.atf8.sj.steffen.radiator.open'},
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC'}
		],
		output: [
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC.homekit'},
			{name: 'TargetHeatingCoolingState', value: 3},
			{name: 'TemperatureDisplayUnits', value: 0}
		],
		displayName: 'Heating'
	}],
	// - schedule
	[require('ftrm-basic/scheduler'), {
		input: [
			'user.steffen.present.atf8',
			'user.steffen.devices.pc.online',
			'user.steffen.devices.laptop.online'
		],
		output: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC.schedule',
		interval: 60000 * 5,
		schedule: (now, present, pc, laptop) => {
			// Don't turn the heating down when sitting in front of the pc
			if (present && pc) return 20;

			const time = now.m / 60 + now.h;

			// Get temperatues
			const tempDay = present ? 19 : 17
			const tempNight = present ? 16 : 12;

			// Build schedule:
			const schedule = [
				// Weekend
				[ 9, tempNight],
				[11, tempDay],
				[ 1, tempDay],
				[ 3, tempNight],
			];

			return linterpol(time, schedule, 24);
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
			'actualValue': {pipe: 'home.haj.atf8.sj.steffen.room.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.steffen.room.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.steffen.radiator.desiredDiffTemperature_degC'}
		}
	}],
	[require('ftrm-basic/combine'), {
		input: {
			'actual': 'home.haj.atf8.sj.steffen.room.actualTemperature_degC',
			'desiredDiff': 'home.haj.atf8.sj.steffen.radiator.desiredDiffTemperature_degC'
		},
		output: 'home.haj.atf8.sj.steffen.radiator.desiredTemperature_degC',
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
			'actualValue': {pipe: 'home.haj.atf8.sj.steffen.radiator.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.steffen.radiator.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.steffen.radiator.open'}
		},
		invert: true
	}]
];
