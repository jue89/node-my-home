const {check, shellyFactory} = require('./shellyCommon.js');

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
		const body = await safeQueryShelly('State');
		if (!body) return;
		if (output.Relay1) output.Relay1.value = body.POWER1 === 'ON';
		if (output.Relay2) output.Relay2.value = body.POWER2 === 'ON';
	}
	if (opts.readbackInterval) {
		const interval = setInterval(publishRelayState, opts.readbackInterval);
		exitCallbacks.push(() => clearInterval(interval));
	}

	// Forward switching commands
	async function setRelay (relay, on) {
		const cmd = `POWER${relay} `;
		const body = await safeQueryShelly(cmd + (on ? 'On' : 'Off'));
		if (!body) return;
		await delay(300);
		await publishRelayState();
	}
	if (input.Relay1) input.Relay1.on('update', (value) => setRelay(1, value));
	if (input.Relay2) input.Relay2.on('update', (value) => setRelay(2, value));

	return exit;
}

module.exports = {check, factory};
