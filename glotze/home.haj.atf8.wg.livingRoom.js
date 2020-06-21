const BASE = __filename.slice(__dirname.length + 1, -3);

function jsonOrString (value) {
	try {
		value = JSON.parse(value);
	} catch (e) { }
	return value;
}

module.exports = [
	// Scenes
	[require('ftrm-http/server'), {
		name: 'livingRoom-secenes-http',
		output: [
			{name: 'scene', pipe: `${BASE}.scene`, convert: jsonOrString}
		],
		port: 8080,
		index: true
	}],
	[require('ftrm-basic/scene'), {
		name: 'livingRoom-secenes',
		input: `${BASE}.scene`,
		output: {
			avReceiverOn: 'home.haj.atf8.wg.livingRoom.media.avReceiver.desiredOnState',
			avReceiverInput: 'home.haj.atf8.wg.livingRoom.media.avReceiver.desiredMainInput',
			tvOn: 'home.haj.atf8.wg.livingRoom.media.tv.desiredOnState'
		},
		scenes: {
			goodNight: async ({}, {avReceiverOn, tvOn}) => {
				avReceiverOn.value = false;
				tvOn.value = false;
			},
			netRadio: async ({}, {avReceiverOn, avReceiverInput, tvOn}, {delay}) => {
				avReceiverOn.value = true;
				tvOn.value = false;
				await delay(3000);
				avReceiverMainInput.value = 'NET RADIO';
			},
			cinema: async({src}, {avReceiverOn, avReceiverInput, tvOn}, {delay}) => {
				avReceiverOn.value = true;
				tvOn.value = true;
				await delay(3000);
				if (src === 'raspi') avReceiverInput.value = 'HDMI1';
				if (src === 'appletv') avReceiverInput.value = 'HDMI2';
			}
		}
	}]
];
