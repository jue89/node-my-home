const spi = require('spi');
const linterpol = require('linterpol');

function hsl2rgb (hue, saturation, lightness) {
	const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
	const huePrime = hue / 60;
	const huePrimeFloor = Math.floor(huePrime);
	const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

	let red;
	let green;
	let blue;

	if (huePrimeFloor === 0) {
		red = chroma;
		green = secondComponent;
		blue = 0;
	} else if (huePrimeFloor === 1) {
		red = secondComponent;
		green = chroma;
		blue = 0;
	} else if (huePrimeFloor === 2) {
		red = 0;
		green = chroma;
		blue = secondComponent;
	} else if (huePrimeFloor === 3) {
		red = 0;
		green = secondComponent;
		blue = chroma;
	} else if (huePrimeFloor === 4) {
		red = secondComponent;
		green = 0;
		blue = chroma;
	} else if (huePrimeFloor === 5) {
		red = chroma;
		green = 0;
		blue = secondComponent;
	}

	const lightnessAdjustment = lightness - (chroma / 2);
	red += lightnessAdjustment;
	green += lightnessAdjustment;
	blue += lightnessAdjustment;

	return [Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255)];
};

const power2hue = [
	[240, 120],
	[270,   0]
];

module.exports = [
	[require('ftrm-basic/generic'), {
		input: 'home.haj.atf8.sj.electricitymeter.avgPowerPerWeek_W',
		factory: (i, o) => {
			// Open SPI device
			const leds = new spi.Spi('/dev/spidev1.0');
			leds.open();

			i[0].on('change', (p) => {
				const hue = linterpol(p, power2hue);
				const color = hsl2rgb(hue, 1, 0.05);
				const spiData = color.concat(color, color, color);
				leds.write(Buffer.from(spiData));
			});
		}
	}]
];

