const {Client} = require('tplink-smarthome-api');

const PLUG_NAME = 'Charging Station';

module.exports = [
	// Homekit Switch
	[require('ftrm-homekit')('Switch'), {
		name: 'charging-switch-homekit',
		input: { 'On': 'home.haj.atf8.sj.jue.charging.actualOnState' },
		output: { 'On': 'home.haj.atf8.sj.jue.charging.desiredOnState.homekit' },
		displayName: 'Charging Station'
	}],

	// Default state logic
	[require('ftrm-basic/select'), {
		name: 'charging-switch',
		input: [
			{pipe: 'home.haj.atf8.sj.jue.charging.desiredOnState.homekit', expire: 24 * 3600 * 1000, logLevelExpiration: null},
			{value: false}
		],
		output: [
			{pipe: 'home.haj.atf8.sj.jue.charging.desiredOnState', retransmit: 20 * 60 * 1000}
		],
		weight: 'prio'
	}],

	// Relay
	[require('ftrm-basic/generic'), {
		name: 'charging-relay',
		input: 'home.haj.atf8.sj.jue.charging.desiredOnState',
		output: 'home.haj.atf8.sj.jue.charging.actualOnState',
		factory: (inputs, outputs, log) => {
			const client = new Client();

			// Keep track of the plug
			let plug;
			client.startDiscovery({address: '100.64.0.1'}).on('device-online', async (device) => {
				const i = await device.getSysInfo();
				if (i.alias === PLUG_NAME) plug = device;
			});

			// Listen for switching requests
			inputs[0].on('update', async (state) => {
				if (!plug) return;
				try {
					await plug.setPowerState(state);
					outputs[0].value = state;
				} catch (err) {
					log.error(err);
				}
			});

			// Stop discovery on exit
			return () => client.stopDiscovery();
		}
	}]
];
