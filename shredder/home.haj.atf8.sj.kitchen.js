const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	// Actors:
	// - radiator valve
	[require('../_lib/homieRelay.js'), {
		name: 'radiator-valve',
		input: `${BASE}.radiator.open`,
		hdpClient,
		cpuid: '0800230011434b5237363620',
		relayName: 'RELAY'
	}],
];
