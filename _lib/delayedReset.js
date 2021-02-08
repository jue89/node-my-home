function check (opts) {
	if (opts.delay === undefined) throw new Error('Delay must be specified');
}

function factory (opts, input, output, log) {
	let to;
	input[0].on('change', (value) => {
		// Just trigger of value changed to true
		if (value === true) {
			if (to) clearTimeout(to);
			to = setTimeout(() => output[0].set(false), opts.delay);
		}
	});

	return () => {
		if (to) clearTimeout(to);
	};
}

module.exports = {check, factory};
