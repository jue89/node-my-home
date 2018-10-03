const fs = require('fs');
const util = require('util');
const EventEmitter = require('events');

const readValueFromFile = (file) => new Promise((resolve, reject) => fs.readFile(file, (err, data) => {
	if (err) reject(err);
	else resolve(parseInt(data.toString()));
}));
const delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

class Poll extends EventEmitter {
	constructor (file, interval) {
		super();
		this.file = file;
		this.interval = interval;
		this.nextTime = 0;
		this.polling = true;
		this._poll();
	}

	async _poll () {
		// Break loop if we shall stop polling
		if (!this.polling) return;

		// Wait until we reached next time fetching
		const now = Date.now();
		if (this.nextTime < now) this.nextTime = now;
		const pause = this.nextTime - now;
		await delay(pause);

		try {
			// Fetch value
			const value = await readValueFromFile(this.file);
			this.emit('value', value, this.nextTime);
		} catch (err) {
			this.emit('error', err);
		}

		// Reschedule polling
		this.nextTime += this.interval;
		this._poll();
	}

	stop () {
		this.polling = false;
	}
}

module.exports = Poll;
