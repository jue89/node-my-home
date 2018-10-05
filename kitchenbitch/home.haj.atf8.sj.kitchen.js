module.exports = [[require('ftrm-sensors/iio'), {
	output: 'home.haj.atf8.sj.kitchen.room.temperature_degC',
	device: 'iio:device0',
	channel: 'in_temp_input',
	interval: 10000
}], [require('ftrm-sensors/iio'), {
	output: 'home.haj.atf8.sj.kitchen.room.humidity_relPercent',
	device: 'iio:device0',
	channel: 'in_humidityrelative_input',
	interval: 10000
}]];
