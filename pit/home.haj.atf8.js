const BASE = __filename.slice(__dirname.length + 1, -3);
const secrets = require('../secrets.json');

module.exports = [
	// Shelly
	[require('../_lib/shelly2.js'), {
		name: 'shelly-ceilingLight',
		input: {
			'Relay1': `${BASE}.garage.ceilingLight.desiredOnState`,
			'Relay2': `${BASE}.garden.powerOutlet.desiredOnState`
		},
		output: {
			'Relay1': `${BASE}.garage.ceilingLight.actualOnState`,
			'Relay2': `${BASE}.garden.powerOutlet.actualOnState`
		},
		readbackInterval: 5 * 1000,
		...secrets.shelly.pitLight
	}],
];
