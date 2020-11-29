const spi = require('spi-device');

const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	require('../_lib/sk9822.js')({
		input: `${BASE}.color_rgb`,
		spiFactory: () => spi.openSync(0, 0),
		ledCount: 36
	}),

	[require('ftrm-basic/map'), {
		name: 'color',
		input: `home.haj.atf8.wg.officeJue.pcJue.inUse`,
		output: `${BASE}.color_rgb`,
		map: (inUse) => inUse ? [24, 0, 64] : [0, 0, 0]
	}]
]
