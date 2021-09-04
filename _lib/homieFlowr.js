const assert = require('assert');

function check (opts) {
	assert(opts.hdpClient, 'hdpClient missing');
	assert(opts.cpuid, 'cpuid missing');
	assert(opts.freqName, 'freqName missing');
	assert(opts.ledName, 'ledName missing');

	if (opts.limit === undefined) opts.limit = 5000;
	if (opts.hysteresis === undefined) opts.hysteresis = 500;
}

async function factory (opts, inputs, outputs) {
	const hdpClient = await opts.hdpClient();
	const hdpDevice = await hdpClient.get(opts.cpuid);
	const hdpEpFreq = hdpDevice.get(opts.freqName);
	const hdpEpLed = hdpDevice.get(opts.ledName);

	let ok = true;

	// Listen for frequency updates
	hdpEpFreq.on('update', ([freq]) => {
		// Check freq
		if (freq > opts.limit + opts.hysteresis) ok = false;
		else if (freq < opts.limit - opts.hyteresis) ok = true;

		// Output ok status
		hdpEpLed.set([ok ? 0 : 1]);
		if (outputs.ok && outputs.ok.value !== ok) outputs.ok.value = ok;

		// Output freq
		if (outputs.freq && outputs.freq.value !== freq) outputs.freq.value = freq;
	});

	return () => hdpClient.close();
}

module.exports = {check, factory};
