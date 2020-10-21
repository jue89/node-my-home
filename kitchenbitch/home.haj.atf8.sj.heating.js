const url = require('url');
const http = require('http');
const secrets = require('./secrets.json');

function delay (msec) {
	return new Promise((resolve) => setTimeout(resolve, msec));
}

function switchRelay (on) {
	const state = on ? 'on' : 'off';
	const query = url.parse(`http://${secrets.therminator.credentials}@shelly-therminator.lan.13pm.eu/relay/0?turn=${state}`);
	return new Promise((resolve, reject) => http.get(query, (res) => {
		const chunks = [];
		res.on('data', (chunk) => chunks.push(chunk));
		res.on('end', () => {
			const body = Buffer.concat(chunks).toString();
			if (res.statusCode === 200) {
				const response = JSON.parse(body);
				resolve(response.ison);
			} else {
				reject(new Error(body));
			}
		});
	}).on('error', (err) => reject(err)));
}

module.exports = [
	// Find the highest temperature request
	[require('ftrm-basic/combine'), {
		name: 'supply-temp-requested',
		input: [
			{pipe: 'home.haj.atf8.sj.jue.radiator.desiredTemperature_degC', expire: 10 * 60 * 1000},
			{pipe: 'home.haj.atf8.sj.steffen.radiator.desiredTemperature_degC', expire: 10 * 60 * 1000},
			{pipe: 'home.haj.atf8.sj.kitchen.radiator.desiredTemperature_degC', expire: 10 * 60 * 1000},
			{pipe: 'home.haj.atf8.wg.officeJue.radiator.desiredTemperature_degC', expire: 10 * 60 * 1000}
		],
		output: [{pipe: 'home.haj.atf8.sj.heating.requestedSupplyTemperature_degC', throttle: 5 * 60 * 1000}],
		combineExpiredInputs: false, // ... only output if every input is valid
		combine: Math.max
	}],

	// Fallback to current maximum if not every room has reported its supply temperature request
	[require('ftrm-basic/select'), {
		name: 'supply-temp-desired',
		input: [
			{pipe: 'home.haj.atf8.sj.heating.requestedSupplyTemperature_degC', expire: 10 * 60 * 1000},
			{pipe: 'home.haj.atf8.sj.maxDesiredDiffTemperature_degC'}
		],
		output: [{pipe: 'home.haj.atf8.sj.heating.desiredSupplyTemperature_degC', throttle: 5 * 60 * 1000}],
		weight: 'prio'
	}],

	// Enable the pump if energy is requested
	[require('ftrm-basic/map'), {
		name: 'heating-onstate-requested',
		input: 'home.haj.atf8.sj.heating.desiredSupplyTemperature_degC',
		output: [{pipe: 'home.haj.atf8.sj.heating.pump.desiredOnState', throttle: 5 * 60 * 1000}],
		map: (temp) => temp > 25
	}],
	[require('ftrm-basic/map'), {
		name: 'heating-onstate',
		input: 'home.haj.atf8.sj.heating.pump.desiredOnState',
		output: 'home.haj.atf8.sj.heating.pump.actualOnState',
		map: async (on) => {
			// Since it takes up to 2 minutes for the valves to drive, we insert a delay
			await delay(2 * 60 * 1000);
			const ison = await switchRelay(on);
			return ison;
		}
	}]
];
