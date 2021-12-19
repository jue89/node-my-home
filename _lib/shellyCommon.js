const http = require('http');
const url = require('url');
const qsem = require('qsem');
const StatefulError = require('ftrm/stateful-error');


function queryFactory ({host, user, password, referer}) {
	let baseurl = `http://${host}/cm?`;
	if (user) baseurl += `user=${user}&`;
	if (password) baseurl += `password=${password}&`;
	baseurl += `cmnd=`;

	const sem = qsem(1);

	return (cmd) => sem.limit(() => new Promise((resolve, reject) => {
		const opts = url.parse(baseurl + cmd);
		opts.headers = {
			'Referer': referer || `${opts.protocol}//${opts.host}`
		};

		http.get(opts, (res) => {
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
		}).on('error', (err) => reject(err))
	}));
}

function check (opts) {
	if (opts.host === undefined) throw new Error('Host must be specified');
	if (opts.failureTolerance === undefined) opts.failureTolerance = 3;
	if (opts.syncTimeInterval === undefined) opts.syncTimeInterval = 10 * 60 * 1000;
}

function shellyFactory (opts, input, output, log) {
	const exitCallbacks = [];

	const queryShelly = queryFactory(opts);
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

	// Sync system time to shelly
	async function syncTime () {
		const time = Math.round(Date.now() / 1000);
		await safeQueryShelly(`Time%20${time}`);
	}
	if (opts.syncTimeInterval) {
		const interval = setInterval(syncTime, opts.syncTimeInterval);
		exitCallbacks.push(() => clearInterval(interval));
	}

	const exit = () => exitCallbacks.forEach((cb) => cb());

	return {
		queryShelly,
		safeQueryShelly,
		exitCallbacks,
		exit
	};
}

module.exports = {check, shellyFactory};
