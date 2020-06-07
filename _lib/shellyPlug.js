const http = require('http');
const url = require('url');
const qsem = require('qsem');
const StatefulError = require('ftrm/stateful-error');

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
	if (opts.readbackInterval && output.Relay) {
		const publishRelayState = () => safeQueryShelly('State').then((body) => {
			if (!body) return;
			output.Relay.value = body.POWER === 'ON';
		});
		const interval = setInterval(publishRelayState, opts.readbackInterval);
		exitCallbacks.push(() => clearInterval(interval));
	}

	// Relay power readback
	if (opts.powerReadoutInterval) {
		const publishRelayPower = () => safeQueryShelly('Status%2010').then((body) => {
			if (!body) return;
			Object.entries(body.StatusSNS.ENERGY).forEach(([key, value]) => {
				if (output[key]) output[key].value = value;
			})
		});
		const interval = setInterval(publishRelayPower, opts.powerReadoutInterval);
		exitCallbacks.push(() => clearInterval(interval));
	}

	// Forward switching commands
	if (input.Relay) {
		const setRelay = (on) => safeQueryShelly(on ? 'Power On' : 'Power Off').then((body) => {
			if (!body) return;
			if (output.Relay) output.Relay.value = body.POWER === 'ON';
		});
		input.Relay.on('update', (value) => setRelay(value));
	}

	return () => exitCallbacks.forEach((cb) => cb());
}

module.exports = {check, factory};
