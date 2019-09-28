module.exports = [
	// Outdoor temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'outside-temp',
		output: 'home.haj.atf8.outside.temperature_degC',
		sensorSerial: '28-0000074b3d84',
		interval: 120000
	}],
	[require('ftrm-homekit')('TemperatureSensor'), {
		name: 'outside-temp-homekit',
		input: [{name: 'CurrentTemperature', pipe: 'home.haj.atf8.outside.temperature_degC'}],
		displayName: 'Temperature'
	}],

	// Maximum desired difftemperature for PID controllers
	[require('ftrm-basic/map'), {
		name: 'supply-temp',
		input: 'home.haj.atf8.outside.temperature_degC',
		output: 'home.haj.atf8.sj.maxDesiredDiffTemperature_degC',
		map: (temp) => Math.max(0, (18 - temp) * 2)
	}],
	[require('ftrm-homekit')('TemperatureSensor'), {
		name: 'supply-temp-homekit',
		input: [{name: 'CurrentTemperature', pipe: 'home.haj.atf8.sj.maxDesiredDiffTemperature_degC'}],
		displayName: 'Supply Temperature'
	}]
];
