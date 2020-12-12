const http = require('http');
const url = require('url');
const qsem = require('qsem');
const StatefulError = require('ftrm/stateful-error');

const POWER_ENDPOINTS = ['Power', 'ApparentPower', 'ReactivePower'];

const delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

function shellyFacotry ({host, user, password}) {
	let baseurl = `http://${host}/cm?`;
	if (user) baseurl += `user=${user}&`;
	if (password) baseurl += `password=${password}&`;
	baseurl += `cmnd=`;

	const sem = qsem(1);

	return (cmd) => sem.limit(() => new Promise((resolve, reject) => http.get(url.parse(baseurl + cmd), (res) => {
		const chunks = [];
		res.on('data', (chunk) => chunks.push(chunk));
		res.on('end', () => {
			const body = Buffer.concat(chunks).toString();
			if (res.statusCode === 200) {
				const response = JSON.parse(body);
				resolve(response);
			} else {
				reject(new Error(body));
			}
		});
	}).on('error', (err) => reject(err))));
}

function check (opts) {
	if (opts.host === undefined) throw new Error('Host must be specified');
	if (opts.failureTolerance === undefined) opts.failureTolerance = 3;
}

function factory (opts, input, output, log) {
	const exitCallbacks = [];

	// Shelly factory
	const queryShelly = shellyFacotry(opts);
	let failureCnt = 0;
	let failure = null;
	const safeQueryShelly = (cmd) => queryShelly(cmd).then((body) => {
		// Resolve present failures
		if (failure) {
			failure.resolve();
			failure = null;
			failureCnt = 0;
		}
		return body;
	}).catch((err) => {
		// Ignore non-repeating failures
		if (++failureCnt < opts.failureTolerance || failure) return;
		failure = new StatefulError(err.message);
		log.error(failure);
		return undefined;
	});

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

	return () => exitCallbacks.forEach((cb) => cb());
}

module.exports = {check, factory};
