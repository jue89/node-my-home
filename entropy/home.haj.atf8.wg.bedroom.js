const BASE = __filename.slice(__dirname.length + 1, -3);

const linterpol = require('linterpol');

module.exports = [
	// Sensors:
	// - room temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'room-temp',
		output: `${BASE}.room.actualTemperature_degC`,
		sensorSerial: '28-0000074a6573',
		interval: 20000
	}],
	// - radiator temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'radiator-temp',
		output: `${BASE}.radiator.actualTemperature_degC`,
		sensorSerial: '10-000802bf3a83',
		interval: 20000
	}],
	// - window contact
	[require('ftrm-gpio/in'), {
		name: 'window-sensor',
		output: `${BASE}.window.open`,
		gpio: 27,
		interval: 5 * 60 * 1000
	}],
	[require('ftrm-basic/sliding-window'), {
		name: 'window-sensor',
		input: `${BASE}.window.open`,
		output: `${BASE}.window.openedRecently`,
		includeValue: (age) => age < 2 * 60 * 60 * 1000, // 2h
		calcOutput: (window) => window.reduce((opened, open) => opened || open, false)
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
		gpio: 17,
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
			{value: 14}
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
	// - homekit
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
			'home.haj.atf8.wg.bedroom.media.speaker.currentlyPlaying',
			'user.jue.present.atf8',
			'user.fpi.present.atf8',
			`${BASE}.window.openedRecently`
		],
		output: `${BASE}.room.desiredTemperature_degC.schedule`,
		interval: 60000 * 5,
		schedule: (now, speakerPlaying, presentJue, presentFpi, windowOpenedRecently) => {
			// Speakers are playing music ...
			if (speakerPlaying) return 19;

			// Nobody's home -> just keep base temp
			if (!presentJue && !presentFpi) return 12;

			// Build schedule:
			const time = now.m / 60 + now.h;
			const tempNight = 16;
			const tempDay = 17;
			const tempSleepy = 19;
			const schedule = (now.dayofweek >= 6) ? [
				// Weekend
				[ 8, tempNight],
				[ 9, windowOpenedRecently ? tempDay : tempSleepy],
				[11, windowOpenedRecently ? tempDay : tempSleepy],
				[12, tempDay],
				[20, tempDay],
				[21, tempSleepy],
				[23, tempSleepy],
				[ 0, tempNight],
			] : [
				// Week day
				[ 6, tempNight],
				[ 7, windowOpenedRecently ? tempDay : tempSleepy],
				[10, windowOpenedRecently ? tempDay : tempSleepy],
				[11, tempDay],
				[20, tempDay],
				[21, tempSleepy],
				[23, tempSleepy],
				[ 0, tempNight],
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
