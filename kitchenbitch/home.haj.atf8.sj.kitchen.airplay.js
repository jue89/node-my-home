const fs = require('fs');
const readFile = (file) => new Promise((resolve, reject) => fs.readFile(file, (err, data) => {
	if (err) reject(err);
	else resolve(data.toString().trim());
}));

module.exports = [
	// Sound card is playing music
	[require('ftrm-basic/inject'), {
		output: [{pipe: 'home.haj.atf8.sj.kitchen.airplay.playing', throttle: 10 * 60 * 1000}],
		inject: () => readFile('/proc/asound/card0/pcm0p/sub0/status').then((d) => d != 'closed'),
		interval: 10000
	}],

	// Speaker
	[require('ftrm-gpio/out'), {
		input: 'home.haj.atf8.sj.kitchen.airplay.playing',
		gpio: 5,
		default: false
	}],
];
