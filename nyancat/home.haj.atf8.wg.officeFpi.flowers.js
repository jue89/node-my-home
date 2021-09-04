const BASE = __filename.slice(__dirname.length + 1, -3);
const hdpClient = require('./lib/hdp.js');

module.exports = [
	[require('../_lib/homieFlowr.js'), {
		name: 'flower-ivy-meas',
		output: {
			freq: `${BASE}.ivy.freq`,
			ok: `${BASE}.ivy.ok`
		},
		hdpClient,
		cpuid: '060011000d434e5938393820',
		freqName: 'CH0_FREQ',
		ledName: 'CH0_LED'
	}],

	[require('../_lib/homieFlowr.js'), {
		name: 'flower-kentia-meas',
		output: {
			freq: `${BASE}.kentia.freq`,
			ok: `${BASE}.kentia.ok`
		},
		hdpClient,
		cpuid: '060011000d434e5938393820',
		freqName: 'CH1_FREQ',
		ledName: 'CH1_LED'
	}],
];
