const qsem = require('qsem');

const SPI_CLK = 100000;
const STEPS = 25;
const STEP_DURATION = 1000 / 25;

const delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const hsv2rgb = ([h, s, v]) => {
	const i = Math.floor(h / 60);
	const f = h / 60 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	let r, g, b;
	switch (i % 6) {
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}

	return [ r * 255, g * 255, b * 255 ];
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
