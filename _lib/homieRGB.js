const assert = require('assert');
const {EventEmitter} = require('events');
const {hsv2rgb, rgb2hsv} = require('./color.js');


class Color extends EventEmitter {
	constructor (hsv = [0, 0, 0]) {
		super();
		this._rgb = [0, 0, 0];
		this._hsv = hsv;
		this._rgb = hsv2rgb(this._hsv);
		this._on = false
	}

	getRGB () {
		return this._rgb;
	}

	getHSV () {
		return this._hsv;
	}

	getOnState () {
		return this._on;
	}

	setOnState (on) {
		if (on === this._on) return;
		this._on = on;
		this.emit('change');
	}

	setHue (hue) {
		if (this._hsv[0] === hue) return;
		this._hsv[0] = hue;
		this._rgb = hsv2rgb(this._hsv);
		this.emit('change');
	}

	setSaturation (sat) {
		if (this._hsv[1] === sat) return;
		this._hsv[1] = sat;
		this._rgb = hsv2rgb(this._hsv);
		this.emit('change');
	}

	setBrightness (brightness) {
		if (this._hsv[2] === brightness) return;
		this._hsv[2] = brightness;
		this._rgb = hsv2rgb(this._hsv);
		this.emit('change');
	}
}

function check (opts) {
	assert(opts.hdpClient, 'hdpClient missing');
	assert(opts.cpuid, 'cpuid missing');
	assert(opts.ledName, 'ledName missing');
}

async function factory (opts, inputs, outputs) {
	const hdpClient = await opts.hdpClient();
	const hdpDevice = await hdpClient.get(opts.cpuid);
	const hdpEpLed = hdpDevice.get(opts.ledName);

	const color = new Color();

	// Ensure the LED always mirrors the current color
	const updateLed = () => hdpEpLed.set(color.getOnState() ? color.getRGB(): [0, 0, 0]);
	hdpEpLed.on('change', updateLed);
	color.on('change', updateLed);

	// Wire outputs
	if (outputs.h) color.on('change', () => outputs.h.value = color.getHSV()[0]);
	if (outputs.s) color.on('change', () => outputs.s.value = color.getHSV()[1]);
	if (outputs.v) color.on('change', () => outputs.v.value = color.getHSV()[2]);
	if (outputs.on) color.on('change', () => outputs.on.value = color.getOnState());

	// Wire inputs
	if (inputs.h) {
		inputs.h.on('change', (h) => color.setHue(h));
		color.setHue(inputs.h.value || 0);
	}
	if (inputs.s) {
		inputs.s.on('change', (s) => color.setSaturation(s));
		color.setSaturation(inputs.s.value || 0);
	}
	if (inputs.v) {
		inputs.v.on('change', (v) => color.setBrightness(v));
		color.setBrightness(inputs.v.value || 0);
	}
	if (inputs.on) {
		inputs.on.on('change', (on) => color.setOnState(on));
		color.setOnState(!!inputs.on.value);
	}

	return () => hdpClient.close();
}

module.exports = {check, factory};
