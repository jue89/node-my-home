module.exports = [
	[require('ftrm-sensors/w1therm'), {
		output: 'home.haj.atf8.outside.temperature_degC',
		sensorSerial: '28-0000074b3d84',
		interval: 10000
	}],
	[require('ftrm-homekit')('TemperatureSensor'), {
		input: [{name: 'CurrentTemperature', pipe: 'home.haj.atf8.outside.temperature_degC'}],
		displayName: 'Temperature'
	}]
];
