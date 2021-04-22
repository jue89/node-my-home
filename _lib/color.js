function hsv2rgb ([h, s, v]) {
	s /= 100;
	v /= 100;
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

	return [ r * 255, g * 255, b * 255 ].map(Math.round);
};

function rgb2hsv ([r, g, b]) {
	r /= 255;
	g /= 255;
	b /= 255;

	const v = Math.max(r, g, b);
	const diff = v - Math.min(r, g, b);
	const diffc = (c) => (v - c) / 6 / diff + 1 / 2;

	let rdif;
	let gdif;
	let bdif;
	let h;
	let s;

	if (diff === 0) {
		h = 0;
		s = 0;
	} else {
		s = diff / v;
		rdif = diffc(r);
		gdif = diffc(g);
		bdif = diffc(b);

		if (r === v) {
			h = bdif - gdif;
		} else if (g === v) {
			h = (1 / 3) + rdif - bdif;
		} else if (b === v) {
			h = (2 / 3) + gdif - rdif;
		}

		if (h < 0) {
			h += 1;
		} else if (h > 1) {
			h -= 1;
		}
	}

	return [ h * 360, s * 100, v * 100 ].map(Math.round);
}

module.exports = { hsv2rgb, rgb2hsv };

