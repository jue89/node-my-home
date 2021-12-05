const secrets = require('../secrets.json');
const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// Speaker:
	// - relay
	[require('../_lib/homieRelay.js'), {
		name: 'speaker-relay',
		input: `${BASE}.speaker.desiredOnState`,
		output: `${BASE}.speaker.actualOnState`,
		hdpClient,
		cpuid: '0e002f000b434e4834363520',
		relayName: 'CH0'
	}],
	// - homekit
	[require('ftrm-homekit')('Switch'), {
		name: 'speaker-homekit',
		input: {'On': `${BASE}.speaker.actualOnState`},
		output: {'On': `${BASE}.speaker.desiredOnState`},
		displayName: 'Speaker'
	}],
	
	// TV:
	// - relay
	[require('../_lib/homieRelay.js'), {
		name: 'tv-relay',
		input: `${BASE}.tv.desiredOnState`,
		output: `${BASE}.tv.actualOnState`,
		hdpClient,
		cpuid: '0e002f000b434e4834363520',
		relayName: 'CH1'
	}],
	// - homekit
	[require('ftrm-homekit')('Switch'), {
		name: 'tv-homekit',
		input: {'On': `${BASE}.tv.actualOnState`},
		output: {'On': `${BASE}.tv.desiredOnState`},
		displayName: 'TV'
	}],
	
	// Open sign:
	// - relay
	[require('../_lib/homieRelay.js'), {
		name: 'openSign-relay',
		input: `${BASE}.openSign.desiredOnState`,
		output: `${BASE}.openSign.actualOnState`,
		hdpClient,
		cpuid: '0e002f000b434e4834363520',
		relayName: 'CH2'
	}],
	// - homekit
	[require('ftrm-homekit')('Switch'), {
		name: 'openSign-homekit',
		input: {'On': `${BASE}.openSign.actualOnState`},
		output: {'On': `${BASE}.openSign.desiredOnState`},
		displayName: 'Open Sign'
	}],
]
