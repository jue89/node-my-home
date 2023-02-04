const fs = require('fs');
const readFile = (file) => new Promise((resolve, reject) => fs.readFile(file, (err, data) => {
	if (err) reject(err);
	else resolve(data.toString().trim());
}));

module.exports = [
	// Sound card is playing music
	[require('ftrm-basic/inject'), {
		name: 'airplay-playing',
		output: [{pipe: 'home.haj.atf8.sj.kitchen.airplay.currentlyPlaying', throttle: 3 * 60 * 1000}],
		inject: () => readFile('/proc/asound/card0/pcm0p/sub0/status').then((d) => d != 'closed'),
		interval: 500
	}],

	// Music has been played in the recent 3 minutes?
	[require('ftrm-basic/sliding-window'), {
		name: 'airplay-speaker-onstate',
		input: [{pipe: 'home.haj.atf8.sj.kitchen.airplay.currentlyPlaying'}],
		output: [{pipe: 'home.haj.atf8.sj.kitchen.airplay.playing', throttle: 10 * 60 * 1000}],
		includeValue: (age, index) => age < 180000,
		calcOutput: (window) => window.reduce((playing, item) => playing || item, false)
	}],
];
