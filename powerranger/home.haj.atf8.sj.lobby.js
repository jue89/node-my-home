module.exports = [
        [require('ftrm-sensors/w1therm'), {
		name: 'room-temp',
                output: 'home.haj.atf8.sj.lobby.room.actualTemperature_degC',
                sensorSerial: '28-00000751a448',
                interval: 120000
        }],
        [require('ftrm-homekit')('TemperatureSensor'), {
		name: 'room-temp-homekit',
                input: [{name: 'CurrentTemperature', pipe: 'home.haj.atf8.sj.lobby.room.actualTemperature_degC'}],
                displayName: 'Temperature'
        }]
];
