const BASE = __filename.slice(__dirname.length + 1, -3);
const fs = require('fs');
const readFile = (file) => new Promise((resolve, reject) => fs.readFile(file, (err, data) => {
	if (err) reject(err);
	else resolve(data.toString().trim());
}));

module.exports = [
	// Sound card is playing music
	[require('ftrm-basic/inject'), {
		name: 'speaker-playing',
		output: [{pipe: `${BASE}.speaker.currentlyPlaying`, throttle: 3 * 60 * 1000}],
		inject: () => readFile('/proc/asound/card1/pcm0p/sub0/status').then((d) => d != 'closed'),
		interval: 500
	}],

	// Turn speaker relay on and off
	[require('ftrm-basic/edge-detection'), {
		name: 'speaker-in-use',
		input: `${BASE}.speaker.currentlyPlaying`,
		output: `${BASE}.speaker.desiredOnState`,
		abortDetectors: true,
		detectors: [
			{match: 'rising-edge', output: true},
			{match: 'falling-edge', output: false, delay: 3 * 60 * 1000},
		]
	}],
]
