const BASE = __filename.slice(__dirname.length + 1, -3);
const linterpol = require('linterpol');

module.exports = [
	// Sensors:
	// - room temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'room-temp',
		output: `${BASE}.room.actualTemperature_degC`,
		sensorSerial: '28-00000751b7c5',
		interval: 20000
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'radiator-temp',
		output: `${BASE}.radiator.actualTemperature_degC`,
		sensorSerial: '10-000802bfaeec',
		interval: 20000
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		name: 'window-sensor',
		output: `${BASE}.window.open`,
		gpio: 27,
		interval: 5 * 60 * 1000
	}],
	[require('ftrm-homekit')('ContactSensor'), {
		name: 'window-sensor-homekit',
		input: {'ContactSensorState': `${BASE}.window.open`},
		displayName: 'Window'
	}],

	// Actors:
	// - radiator valve
	[require('ftrm-gpio/out'), {
		name: 'radiator-valve',
		input: [{pipe: `${BASE}.radiator.open`, expire: 60000}],
		gpio: 22,
		default: false
	}],

	// Setpoint:
	// - select
	[require('ftrm-basic/select'), {
		name: 'room-setpoint',
		input: [
			{pipe: `${BASE}.room.desiredTemperature_degC.window`},
			{pipe: `${BASE}.room.desiredTemperature_degC.manual`, expire: 3 * 60 * 60 * 1000, logLevelExpiration: null},
			{pipe: `${BASE}.room.desiredTemperature_degC.schedule`},
			{value: 12}
		],
		output: `${BASE}.room.desiredTemperature_degC`,
		weight: 'prio'
	}],
	// - window
	[require('ftrm-basic/map'), {
		name: 'room-setpoint-window',
		input: `${BASE}.window.open`,
		output: `${BASE}.room.desiredTemperature_degC.window`,
		map: (open) => open ? 10 : undefined
	}],
	// - manual
	[require('ftrm-homekit')('Thermostat'), {
		name: 'room-setpoint-homekit',
		input: [
			{name: 'CurrentTemperature', pipe: `${BASE}.room.actualTemperature_degC`},
			{name: 'CurrentHeatingCoolingState', pipe: `${BASE}.radiator.open`},
			{name: 'TargetTemperature', pipe: `${BASE}.room.desiredTemperature_degC`}
		],
		output: [
			{name: 'TargetTemperature', pipe: `${BASE}.room.desiredTemperature_degC.manual`},
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
			'home.haj.atf8.wg.officeJue.pcJue.inUse'
		],
		output: `${BASE}.room.desiredTemperature_degC.schedule`,
		interval: 60000 * 5,
		schedule: (now, presentJue, distance, pcInUse) => {
			// Don't turn the heating down when someone is sitting in front of the PC
			if (pcInUse) return 19;

			const time = now.m / 60 + now.h;

			// Get temperatues
			if (presentJue) distance = 0;
			const tempDay = linterpol(distance, [
				[  100, 18],
				[ 4100, 16],
				[80000, 12]
			]);
			const tempNight = 12;

			// Build schedule:
			const schedule = (now.dayofweek >= 6) ? [
				// Weekend
				[10, tempNight],
				[11, tempDay],
				[23, tempDay],
				[ 0, tempNight],
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
			'k_p': {value: 4},
			'k_i': {value: 0.02},
			'k_d': {value: 0},
			'u_min': {value: 0},
			'u_max': {value: 30, pipe: 'home.haj.atf8.sj.maxDesiredDiffTemperature_degC'},
			'actualValue': {pipe: `${BASE}.room.actualTemperature_degC`},
			'desiredValue': {pipe: `${BASE}.room.desiredTemperature_degC`}
		},
		output: {
			'controlValue': {pipe: `${BASE}.radiator.desiredDiffTemperature_degC`}
		}
	}],
	[require('ftrm-basic/combine'), {
		name: 'radiator-setpoint',
		input: {
			'actual': `${BASE}.room.actualTemperature_degC`,
			'desiredDiff': `${BASE}.radiator.desiredDiffTemperature_degC`
		},
		output: `${BASE}.radiator.desiredTemperature_degC`,
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
			'actualValue': {pipe: `${BASE}.radiator.actualTemperature_degC`},
			'desiredValue': {pipe: `${BASE}.radiator.desiredTemperature_degC`}
		},
		output: {
			'controlValue': {pipe: `${BASE}.radiator.open`}
		},
		invert: true
	}]
];
