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

	return () => exitCallbacks.forEach((cb) => cb());
}

module.exports = {check, factory};
