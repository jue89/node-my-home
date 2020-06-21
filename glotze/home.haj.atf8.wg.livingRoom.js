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
		output: [
			{name: 'scene', pipe: `${BASE}.scene`, convert: jsonOrString}
		],
		port: 8080,
		index: true
	}],
	[require('ftrm-basic/scene'), {
		input: `${BASE}.scene`,
		output: {
			avReceiverOn: 'home.haj.atf8.wg.livingRoom.media.avReceiver.desiredOnState',
			tvOn: 'home.haj.atf8.wg.livingRoom.media.tv.desiredOnState'
		},
		scenes: {
			goodNight: async ({}, {avReceiverOn, tvOn}) => {
				avReceiverOn.value = false;
				tvOn.value = false;
			},
			netRadio: async ({}, {avReceiverOn, tvOn}) => {
				avReceiverOn.value = true;
				tvOn.value = false;
			},
			cinema: async({}, {avReceiverOn, tvOn}) => {
				avReceiverOn.value = true;
				tvOn.value = true;
			}
		}
	}]
];
