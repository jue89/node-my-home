class Median {
	constructor (len, init, gcInterval) {
		if (len % 2 === 0) throw new Error('Just odd length are supported');
		if (init === undefined) init = 0;
		if (gcInterval === undefined) gcInterval = 100000;
		this.data = [];
		this.len = len;
		this.start = 0;
		this.mid = Math.floor(len / 2);
		for (let i = 0; i < len; i++) this.data.push(init);
		setInterval(() => { this.gc(); }, gcInterval);
	}

	step (value) {
		this.data.push(value);
		this.start++;
		return this.data.slice(this.start).sort()[this.mid];
	}

	gc () {
		this.data = this.data.slice(this.start);
		this.start = 0;
	}
}

module.exports = Median;
