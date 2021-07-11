const assert = require('assert');

function check (opts) {
	assert(opts.hdpClient, 'hdpClient missing');
	assert(opts.cpuid, 'cpuid missing');
	assert(opts.relayName, 'relayName missing');
}

async function factory (opts, inputs, outputs) {
	const hdpClient = await opts.hdpClient();
	const hdpDevice = await hdpClient.get(opts.cpuid);
	const hdpEpRelay = hdpDevice.get(opts.relayName);

	// Listen for changes from input
	if (inputs[0]) {
		inputs[0].on('update', (state) => {
			hdpEpRelay.set([state ? 1 : 0]);
		});
	}

	// Listen on relay state changes
	if (outputs[0]) {
		hdpEpRelay.on('update', ([state]) => {
			// Convert state to boolean
			state = !!state;

			// Ignore unchanged state
			if (outputs[0].value === state) return;

			// Update output
			outputs[0].value = state;
		});
	}

	return () => hdpClient.close();
}

module.exports = {check, factory};
