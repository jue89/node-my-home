const qsem = require('qsem');
const {hsv2rgb} = require('./color.js');

const SPI_CLK = 100000;
const STEPS = 25;
const STEP_DURATION = 1000 / 25;

const delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const bufClear = Buffer.from([0x00, 0x00, 0x00, 0x00]);

module.exports = ({spiFactory, input, ledCount, filter}) => [require('ftrm-basic/generic'), {
	name: 'leds',
	input,
	factory: (inputs) => {
		// Pass-thru filter if no filter has been specified
		if (!filter) filter = (x) => x;

		const leds = spiFactory();

		// Displays a list of RGB colors
		const display = (colors) => {
			const bufferList = colors.map(([r, g, b]) => Buffer.from([0xff, Math.round(b), Math.round(g), Math.round(r)]));
			bufferList.unshift(bufClear);
			bufferList.push(bufClear);
			const sendBuffer = Buffer.concat(bufferList);
			leds.transfer([{
				sendBuffer,
				byteLength: sendBuffer.length,
				speedHz: SPI_CLK
			}], () => {});
		}

		// Fill current color array
		let currentColors = [];
		for (let i = 0; i < ledCount; i++) {
			currentColors.push([0, 0, 0]);
		}

		// Fades to a HSV color
		const sem = qsem(1);
		const fade = (nextColor) => sem.limit(async () => {
			const targetColors = [];
			for (let i = 0; i < ledCount; i++) {
				targetColors.push(hsv2rgb(filter(nextColor, i)));
			}

			const steps = targetColors.map(([toR, toG, toB], n) => {
				const [fromR, fromG, fromB] = currentColors[n];
				const stepR = (toR - fromR) / STEPS;
				const stepG = (toG - fromG) / STEPS;
				const stepB = (toB - fromB) / STEPS;
				return [stepR, stepG, stepB];
			});

			for (let i = 0; i < STEPS; i++) {
				currentColors = currentColors.map(([r, g, b], n) => {
					const [stepR, stepG, stepB] = steps[n];
					return [r + stepR, g + stepG, b + stepB];
				});
				display(currentColors);
				await delay(STEP_DURATION);
			}
		});

		inputs[0].on('update', (nextColor) => fade(nextColor));

		return () => leds.closeSync();
	}
}];
