const assert = require('assert');

function check (opts) {
	assert(opts.hdpClient, 'hdpClient missing');
	assert(opts.cpuid, 'cpuid missing');
	assert(opts.btnName, 'btnName missing');
	assert(opts.ledName, 'ledName missing');
	if (opts.brightnessOff === undefined) opts.brightnessOff = 32;
	if (opts.brightnessOn === undefined) opts.brightnessOn = 255;
}

async function factory (opts, inputs, outputs) {
	const hdpClient = await opts.hdpClient();
	const hdpDevice = await hdpClient.get(opts.cpuid);
	const hdpEpBtn = hdpDevice.get(opts.btnName);
	const hdpEpLed = hdpDevice.get(opts.ledName);

	let state;

	// Ensure the LED has the right brightness
	hdpEpLed.on('change', updateLed);
	function updateLed () {
		const brightness = state ? opts.brightnessOn : opts.brightnessOff;
		hdpEpLed.set([brightness]);
	};

	// Set initial state
	setState(opts.defaultState);
	function setState (_state) {
		// Ensure state is a boolean and store it globaly
		_state = !!_state;

		// Ignore unchanged states
		if (_state === state) return;

		// Store new state
		state = _state;

		// Propagate new state to output
		if (outputs[0]) outputs[0].value = state;

		// Update the LED
		updateLed();
	}

	// Listen for changes from input
	if (inputs[0]) inputs[0].on('update', (value) => setState(value));

	// Listen on button events
	hdpEpBtn.on('change', ([cntDown, cntUp]) => {
		// Ignore button up events
		if (cntDown === cntUp) return;

		// Toggle state
		setState(!state);
	});

	return () => hdpClient.close();
}

module.exports = {check, factory};
