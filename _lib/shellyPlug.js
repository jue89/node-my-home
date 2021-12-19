const {check, shellyFactory} = require('./shellyCommon.js');

const POWER_ENDPOINTS = ['Power', 'ApparentPower', 'ReactivePower'];

const delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

function factory (opts, input, output, log) {
	const {
		queryShelly,
		safeQueryShelly,
		exitCallbacks,
		exit
	} = shellyFactory(opts, input, output, log);

	// Relay state readback
	async function publishRelayState () {
		if (!output.Relay) return;
		const body = await safeQueryShelly('State');
		if (!body) return;
		output.Relay.value = body.POWER === 'ON';
	}
	if (opts.readbackInterval) {
		const interval = setInterval(publishRelayState, opts.readbackInterval);
		exitCallbacks.push(() => clearInterval(interval));
	}

	// Relay power readback
	const powerOutputs = POWER_ENDPOINTS.filter((key) => output[key]);
	async function publishRelayPower () {
		if (powerOutputs.length === 0) return;
		const body = await safeQueryShelly('Status%2010');
		if (!body) return;
		powerOutputs.forEach((key) => {
			output[key].value = body.StatusSNS.ENERGY[key];
		});
	}
	if (opts.powerReadoutInterval) {
		const interval = setInterval(publishRelayPower, opts.powerReadoutInterval);
		exitCallbacks.push(() => clearInterval(interval));
	}

	// Forward switching commands
	async function setRelay (on) {
		const body = await safeQueryShelly(on ? 'Power On' : 'Power Off');
		if (!body) return;
		await delay(300);
		await publishRelayState();
		await delay(700);
		await publishRelayPower();
	}
	if (input.Relay) {
		input.Relay.on('update', (value) => setRelay(value));
	}

	return exit;
}

module.exports = {check, factory};
