const spi = require('spi-device');

const BASE = __filename.slice(__dirname.length + 1, -3);

const COLOR_OK = [64, 0, 128];
const COLOR_FAIL = [255, 0, 32];

const SPI_BUS = 0;
const SPI_CS = 0;
const SPI_CLK = 100000;
const LED_COUNT_SIDE = 17;
const LED_COUNT_TOP = 15;

module.exports = [
	[require('ftrm-basic/combine'), {
		name: 'rack-color',
		input: [
			'node.bockelfelde.volumes.md0.online',
			'node.ned.volumes.tank.online',
			'node.srv2.volumes.md0.online',
			'node.tony.volumes.md0.online'
		],
		output: `${BASE}.color_rgb`,
		combineExpiredInputs: true,
		combine: (...raids) => {
			const ok = raids.reduce((ok, r) => ok && r !== false, true);
			return ok ? COLOR_OK : COLOR_FAIL;
		}
	}],

	[require('ftrm-basic/generic'), {
		name: 'rack-leds',
		input: `${BASE}.color_rgb`,
		factory: (inputs) => {
			const leds = spi.openSync(SPI_BUS, SPI_CS);

			inputs[0].on('update', ([r, g, b]) => {
				const bufClear = Buffer.from([0x00, 0x00, 0x00, 0x00]);
				const bufColorSide = Buffer.from([0xe7, b, g, r]);
				const bufColorTop = Buffer.from([0xff, b, g, r]);
				const bufs = [bufClear];
				for (let i = 0; i < LED_COUNT_SIDE; i++) {
					bufs.push(bufColorSide);
				}
				for (let i = 0; i < LED_COUNT_TOP; i++) {
					bufs.push(bufColorTop);
				}
				for (let i = 0; i < LED_COUNT_SIDE; i++) {
					bufs.push(bufColorSide);
				}
				bufs.push(bufClear);
				const sendBuffer = Buffer.concat(bufs);
				leds.transfer([{
					sendBuffer,
					byteLength: sendBuffer.length,
					speedHz: SPI_CLK
				}], () => {});
			});

			return () => leds.closeSync();
		}
	}],
];
