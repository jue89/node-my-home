const qsem = require('qsem');

const SPI_CLK = 100000;
const STEPS = 25;
const STEP_DURATION = 1000 / 25;

const delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

module.exports = ({spiFactory, input, ledCount}) => [require('ftrm-basic/generic'), {
	name: 'leds',
	input,
	factory: (inputs) => {
		const leds = spiFactory()
		const display = ([r, g, b]) => {
			const bufClear = Buffer.from([0x00, 0x00, 0x00, 0x00]);
			const bufColor = Buffer.from([0xff, Math.round(b), Math.round(g), Math.round(r)]);
			const bufs = [bufClear];
			for (let i = 0; i < ledCount; i++) {
				bufs.push(bufColor);
			}
			bufs.push(bufClear);
			const sendBuffer = Buffer.concat(bufs);
			leds.transfer([{
				sendBuffer,
				byteLength: sendBuffer.length,
				speedHz: SPI_CLK
			}], () => {});
		}

		let currentColor = [0, 0, 0];
		const sem = qsem(1);
		const fade = (nextColor) => sem.limit(async () => {
			const [fromR, fromG, fromB] = currentColor;
			const [toR, toG, toB] = nextColor;
			const stepR = (toR - fromR) / STEPS;
			const stepG = (toG - fromG) / STEPS;
			const stepB = (toB - fromB) / STEPS;

			let r = fromR;
			let g = fromG;
			let b = fromB;
			for (let i = 0; i < STEPS; i++) {
				r += stepR;
				g += stepG;
				b += stepB;
				display([r, g, b]);
				await delay(STEP_DURATION);
			}
			currentColor = nextColor;
		});

		inputs[0].on('update', (nextColor) => fade(nextColor));

		return () => leds.closeSync();
	}
}];

