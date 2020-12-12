const spi = require('spi-device');

const BASE = __filename.slice(__dirname.length + 1, -3);

const HUE_OK = 270;
const HUE_FAIL = 320;

const SPI_BUS = 0;
const SPI_CS = 0;
const SPI_CLK = 100000;
const LED_COUNT_SIDE = 17;
const LED_COUNT_TOP = 15;

module.exports = [
	[require('ftrm-basic/combine'), {
		name: 'rack-hue',
		input: [
			'node.bockelfelde.volumes.md0.online',
			'node.ned.volumes.tank.online',
			'node.srv2.volumes.md0.online',
			'node.tony.volumes.md0.online'
		],
		output: `${BASE}.color_hue`,
		combineExpiredInputs: true,
		combine: (...raids) => {
			const ok = raids.reduce((ok, r) => ok && r !== false, true);
			return ok ? HUE_OK : HUE_FAIL;
		}
	}],

	[require('ftrm-basic/combine'), {
		name: 'rack-color',
		input: [`${BASE}.color_hue`, `home.haj.atf8.wg.officeJue.pcJue.inUse`],
		output: `${BASE}.color_hsv`,
		combine: (hue, inUse) => inUse ? [hue, 1, 1] : [hue, 1, 0.3]
	}],

	require('../_lib/sk9822.js')({
		input: `${BASE}.color_hsv`,
		spiFactory: () => spi.openSync(0, 0),
		ledCount: LED_COUNT_SIDE + LED_COUNT_TOP + LED_COUNT_SIDE,
		filter: ([h, s, v], n) => {
			if (n < LED_COUNT_SIDE || n > LED_COUNT_SIDE + LED_COUNT_TOP) return [h, s, v * 0.3];
			else return [h, s, v];
		}
	}),
];
