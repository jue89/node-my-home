const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	// room temperature
	[require('ftrm-sensors/w1therm'), {
		name: 'room-temp',
		output: `${BASE}.room.actualTemperature_degC`,
		sensorSerial: '10-000803708be1',
		interval: 20000
	}],
];
