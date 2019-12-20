const linterpol = require('linterpol');

module.exports = [
	// Sensors:
	// - room temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'room-temp',
		output: 'home.haj.atf8.sj.jue.room.actualTemperature_degC',
		sensorSerial: '28-0000074a6573',
		interval: 20000
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'radiator-temp',
		output: 'home.haj.atf8.sj.jue.radiator.actualTemperature_degC',
		sensorSerial: '10-000802bf3a83',
		interval: 20000
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		name: 'window-sensor',
		output: 'home.haj.atf8.sj.jue.window.open',
		gpio: 27,
		interval: 5 * 60 * 1000
	}],
	[require('ftrm-homekit')('ContactSensor'), {
		name: 'window-sensor-homekit',
		input: {'ContactSensorState': 'home.haj.atf8.sj.jue.window.open'},
		displayName: 'Window'
	}],

	// Actors:
	// - radiator valve
	[require('ftrm-gpio/out'), {
		name: 'radiator-valve',
		input: [{pipe: 'home.haj.atf8.sj.jue.radiator.open', expire: 60000}],
		gpio: 17,
		default: false
	}],

	// Setpoint:
	// - select
	[require('ftrm-basic/select'), {
		name: 'room-setpoint',
		input: [
			{pipe: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC.window'},
			{pipe: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC.homekit', expire: 3 * 60 * 60 * 1000, logLevelExpiration: null},
			{pipe: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC.schedule'},
			{value: 14}
		],
		output: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC',
		weight: 'prio'
	}],
	// - window
	[require('ftrm-basic/map'), {
		name: 'room-setpoint-window',
		input: 'home.haj.atf8.sj.jue.window.open',
		output: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC.window',
		map: (open) => open ? 10 : undefined
	}],
	// - homekit
	[require('ftrm-homekit')('Thermostat'), {
		name: 'room-setpoint-homekit',
		input: [
			{name: 'CurrentTemperature', pipe: 'home.haj.atf8.sj.jue.room.actualTemperature_degC'},
			{name: 'CurrentHeatingCoolingState', pipe: 'home.haj.atf8.sj.jue.radiator.open'},
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC'}
		],
		output: [
			{name: 'TargetTemperature', pipe: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC.homekit'},
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
			'user.jue.distance_m.home',
			'user.jue.devices.bart.online',
			'user.fpi.present.atf8'
		],
		output: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC.schedule',
		interval: 60000 * 5,
		schedule: (now, presentJue, distance, pc, presentFpi) => {
			// Don't turn the heating down when sitting in front of the pc
			if (presentJue && pc) return 19;

			const time = now.m / 60 + now.h;

			// Get temperatues
			if (presentJue || presentFpi) distance = 0;
			const tempDay = linterpol(distance, [
				[  100, 18],
				[ 4100, 16],
				[80000, 12]
			]);
			const tempNight = (presentJue || presentFpi) ? 15 : 12;

			// Build schedule:
			const schedule = (now.dayofweek >= 6) ? [
				// Weekend
				[ 9, tempNight],
				[11, tempDay],
				[23, tempDay],
				[ 1, tempNight],
			] : [
				// Week day
				[ 8, tempNight],
				[ 9, tempDay],
				[22, tempDay],
				[23, tempNight],
			];

			return linterpol(time, schedule, 24);
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
			'actualValue': {pipe: 'home.haj.atf8.sj.jue.room.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.jue.room.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.jue.radiator.desiredDiffTemperature_degC'}
		}
	}],
	[require('ftrm-basic/combine'), {
		name: 'radiator-setpoint',
		input: {
			'actual': 'home.haj.atf8.sj.jue.room.actualTemperature_degC',
			'desiredDiff': 'home.haj.atf8.sj.jue.radiator.desiredDiffTemperature_degC'
		},
		output: 'home.haj.atf8.sj.jue.radiator.desiredTemperature_degC',
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
			'actualValue': {pipe: 'home.haj.atf8.sj.jue.radiator.actualTemperature_degC'},
			'desiredValue': {pipe: 'home.haj.atf8.sj.jue.radiator.desiredTemperature_degC'}
		},
		output: {
			'controlValue': {pipe: 'home.haj.atf8.sj.jue.radiator.open'}
		},
		invert: true
	}]
];
