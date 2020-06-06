const http = require('http');
const url = require('url');
const secrets = require('./secrets.json');

function query (host, cmd) {
	const query = url.parse(`http://${host}/cm?user=${secrets.shelly.user}&password=${secrets.shelly.password}&cmnd=${cmd}`);
	return new Promise((resolve, reject) => http.get(query, (res) => {
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
	}).on('error', (err) => reject(err)));
}

async function fetchPower (host) {
	const body = await query(host, 'Status%2010');
	return body.StatusSNS.ENERGY;
}

async function switchRelay (host, on) {
	const body = await query(host, on ? 'Power On' : 'Power Off');
	return body.POWER === 'ON';
}

module.exports = [
	// Master: Power measurement
	[require('ftrm-basic/inject-many'), {
		name: 'pc-power',
		output: {
			'Power': 'home.haj.atf8.wg.office.pcJue.master.activePower',
			'ApparentPower': 'home.haj.atf8.wg.office.pcJue.master.apparentPower',
			'ReactivePower': 'home.haj.atf8.wg.office.pcJue.master.reactivePower',
		},
		inject: () => fetchPower('100.64.0.2'),
		interval: 20 * 1000
	}],

	// Master: Power switch
	[require('ftrm-homekit')('Switch'), {
		name: 'pc-switch-homekit',
		input: { 'On': 'home.haj.atf8.wg.office.pcJue.master.actualOnState' },
		output: { 'On': 'home.haj.atf8.wg.office.pcJue.master.desiredOnState.switch' },
		displayName: 'PC'
	}],

	// Master: Power based switch: Keep the relay on as long the PC is powered on
	[require('ftrm-basic/map'), {
		name: 'pc-switch-power',
		input: 'home.haj.atf8.wg.office.pcJue.master.activePower',
		output: 'home.haj.atf8.wg.office.pcJue.master.desiredOnState.power',
		// true -> Keep power on; undefined -> Ask someone else ...
		map: (pwr) => (pwr > 15) ? true : undefined
	}],

	// Master: Override switch: Keeps the PC powered on - no matter whats going on
	[require('ftrm-homekit')('Switch'), {
		name: 'pc-switch-override',
		output: { 'On': 'home.haj.atf8.wg.office.pcJue.master.desiredOnState.override' },
		displayName: 'PC Override'
	}],

	// Master: Select the power on state based
	[require('ftrm-basic/select'), {
		name: 'pc-switch',
		input: [
			{pipe: 'home.haj.atf8.wg.office.pcJue.master.desiredOnState.switch', expire: 50 * 1000, logLevelExpiration: null},
			{pipe: 'home.haj.atf8.wg.office.pcJue.master.desiredOnState.power', expire: 90 * 1000},
			{pipe: 'home.haj.atf8.wg.office.pcJue.master.desiredOnState.override'},
			{value: false}
		],
		output: [
			{pipe: 'home.haj.atf8.wg.office.pcJue.master.desiredOnState', throttle: 10 * 60 * 1000}
		],
		weight: 'prio'
	}],

	// Master: Switch the relay ...
	[require('ftrm-basic/map'), {
		name: 'pc-relay',
		input: 'home.haj.atf8.wg.office.pcJue.master.desiredOnState',
		output: 'home.haj.atf8.wg.office.pcJue.master.actualOnState',
		map: (on) => switchRelay('100.64.0.2', on)
	}],

	// Slave: Power measurement
	[require('ftrm-basic/inject-many'), {
		name: 'periph-power',
		output: {
			'Power': 'home.haj.atf8.wg.office.pcJue.slave.activePower',
			'ApparentPower': 'home.haj.atf8.wg.office.pcJue.slave.apparentPower',
			'ReactivePower': 'home.haj.atf8.wg.office.pcJue.slave.reactivePower',
		},
		inject: () => fetchPower('100.64.0.3'),
		interval: 20 * 1000
	}],

	// Slave: Override switch: Keeps the PC powered on - no matter whats going on
	[require('ftrm-homekit')('Switch'), {
		name: 'periph-switch-override',
		output: { 'On': 'home.haj.atf8.wg.office.pcJue.slave.desiredOnState.override' },
		displayName: 'PC Periph Override'
	}],

	// Slave: Select the power on state based
	[require('ftrm-basic/combine'), {
		name: 'periph-switch',
		input: [
			{pipe: 'home.haj.atf8.wg.office.pcJue.master.actualOnState'},
			{pipe: 'user.jue.present.atf8'},
			{pipe: 'home.haj.atf8.wg.office.pcJue.slave.desiredOnState.override'}
		],
		output: [
			{pipe: 'home.haj.atf8.wg.office.pcJue.slave.desiredOnState', throttle: 10 * 60 * 1000}
		],
		combineExpiredInputs: true,
		combine: (masterOnState, juePresent, override) => override || (masterOnState && juePresent) || false
	}],

	// Slave: Switch the relay ...
	[require('ftrm-basic/map'), {
		name: 'periph-relay',
		input: 'home.haj.atf8.wg.office.pcJue.slave.desiredOnState',
		output: 'home.haj.atf8.wg.office.pcJue.slave.actualOnState',
		map: (on) => switchRelay('100.64.0.3', on)
	}],
];
