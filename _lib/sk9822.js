const qsem = require('qsem');

const SPI_CLK = 100000;
const STEPS = 25;
const STEP_DURATION = 1000 / 25;

const delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const hsv2rgb = ([h, s, v]) => {
	const c = v * s;
	const x = c * (1 - Math.abs((h / 60) % 2 - 1));
	const m = v - c;
	const [r0, g0, b0] = (h < 60) ? [c, x, 0]
		: (h < 120) ? [x, c, 0]
		: (h < 180) ? [0, c, x]
		: (h < 240) ? [0, x, c]
		: (h < 300) ? [x, 0, c]
		: [x, 0, c];
	return [(r0 + m) * 255, (g0 + m) * 255, (b0 + m) * 255];
};

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
