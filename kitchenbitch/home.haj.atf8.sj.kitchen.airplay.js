module.exports = [
	// Speaker
	[require('ftrm-gpio/out'), {
		name: 'airplay-speaker',
		input: 'home.haj.atf8.sj.kitchen.airplay.playing',
		gpio: 5,
		default: false
	}],
];
