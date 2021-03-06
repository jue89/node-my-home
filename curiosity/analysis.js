const stream = require('stream');
const tsfoo = require('tsfoo');
const secrets = require('./secrets.json');

class Window extends stream.Transform {
	constructor (startAt = 0, periodLength = 24 * 3600 * 1000, scale = 3600 * 1000) {
		super({objectMode: true});
		this.periodLength = periodLength;
		this.scale = scale;
		this.data = [];
		this.now = 0;
		this.startAt = startAt;
	}

	_transform (chunk, encoding, callback) {
		this.now = chunk.timestamp;
		const oldest = this.now - this.periodLength;
		this.data.push(chunk);
		while (this.data[0].timestamp < oldest) this.data.shift();
		if (this.data.length >= 2 && this.now > this.startAt) {
			const dy = this.data[0].value - this.data[this.data.length - 1].value;
			const dx = this.data[0].timestamp - this.data[this.data.length - 1].timestamp;
			this.push({timestamp: this.now, value: dy / dx * this.scale});
		}
		callback();
	}
}

module.exports = async (ftrm) => {
	const nodes = [];

	async function newSeries(src, dst) {
		const from = Date.now() - dst.reduce((acc, d) => Math.max(acc, d.periodLength), 0) - 3600000;
		src = await db.createReadStream(src, {follow: true, from});
		dst.forEach((d) => {
			const w = new Window(Date.now(), d.periodLength);
			src.pipe(w);
			nodes.push([require('ftrm-basic/generic'), {
				name: `aggregate-${d.pipe}`,
				output: d.pipe,
				factory: (i, o) => {
					w.on('data', (item) => o[0].set(item.value, item.timestamp));
					return () => w.destroy();
				}
			}]);
		});
	}

	// Open database
	const db = await tsfoo.openDB(secrets.dbPath);

	// Add meters
	await newSeries('home.haj.atf8.sj.electricitymeter.energyTotal_Wh', [{
		periodLength: 24 * 3600 * 1000,
		pipe: 'home.haj.atf8.sj.electricitymeter.avgPowerPerDay_W'
	}, {
		periodLength: 7 * 24 * 3600 * 1000,
		pipe: 'home.haj.atf8.sj.electricitymeter.avgPowerPerWeek_W'
	}, {
		periodLength: 4 * 7 * 24 * 3600 * 1000,
		pipe: 'home.haj.atf8.sj.electricitymeter.avgPowerPerMonth_W'
	}]);
	await newSeries('home.haj.atf8.sj.gasmeter.volumeTotal_L', [{
		periodLength: 24 * 3600 * 1000,
		pipe: 'home.haj.atf8.sj.gasmeter.avgVolumePerDay_Lph'
	}, {
		periodLength: 7 * 24 * 3600 * 1000,
		pipe: 'home.haj.atf8.sj.gasmeter.avgVolumePerWeek_Lph'
	}, {
		periodLength: 4 * 7 * 24 * 3600 * 1000,
		pipe: 'home.haj.atf8.sj.gasmeter.avgVolumePerMonth_Lph'
	}]);

	return nodes;
};
