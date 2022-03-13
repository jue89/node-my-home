const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// room temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'room-temp',
		output: `${BASE}.actualTemperature_degC`,
		sensorSerial: '10-00080370cce1',
		interval: 20000
	}],
];
