const BASE = __filename.slice(__dirname.length + 1, -3);
const secrets = require('../secrets.json');

module.exports = [
	// Shelly
	[require('../_lib/shellyPlug.js'), {
		name: 'zero-relay',
		input: {
			'Relay': `${BASE}.desiredOnState`
		},
		output: {
			'Relay': `${BASE}.actualOnState`,
			'Power': `${BASE}.activePower_W`,
			'ApparentPower': `${BASE}.apparentPower_VA`,
			'ReactivePower': `${BASE}.reactivePower_var`
		},
		powerReadoutInterval: 20 * 1000,
		readbackInterval: 20 * 1000,
		...secrets.shelly.zero
	}],
];
