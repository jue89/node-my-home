const {SerialPort} = require('serialport');
const {Writable} = require('stream');
const {EventEmitter} = require('events');
const {SmlFile} = require('open-sml');

class DelayedTimeout {
	constructor (fn, delay) {
		this.fn = fn;
		this.delay = delay;
	}

	trigger () {
		clearTimeout(this.to);
		this.to = setTimeout(this.fn, this.delay);
	}
}

class Cutter extends Writable {
	constructor () {
		super();
		this.data = [];
		this.to = new DelayedTimeout(() => {
			this.emit('data', Buffer.concat(this.data));
			this.data = [];
		}, 500);
	}

	_write(chunk, enc, done) {
		this.data.push(chunk);
		this.to.trigger();
		done();
	}
}

class SmartMeter extends EventEmitter {
	constructor (tty, offset = 0, step = 1) {
		super();

		let lastEvent = 0;
		let pwr = [];

		const sml = new Cutter();
		tty.pipe(sml).on('data', (msg) => {
			try {
				const file = new SmlFile();
				file.parse(msg);
				const {messageBody} = file.messages.find(({messageTag}) => messageTag === 1793);
				const {listEntries} = messageBody.valList;
				const items = Object.fromEntries(listEntries.filter(({unit}) => unit > 0).map(({objName, unit, scaler, value}) => [objName.toString('hex'), {
					unit: unit,
					value: Math.pow(10, scaler) * value
				}]));

				const energyWh = items['0100010800ff'].value + offset;
				const powerW = items['0100240700ff'].value;

				pwr.push(powerW);

				if (lastEvent + step < energyWh) {
					lastEvent = energyWh;
					const power = pwr.reduce((acc, val, arr) => acc + val, 0) / pwr.length;
					pwr = [];
					this.emit('power', power);
					this.emit('totalEnergy', energyWh);
				}
			} catch (err) {
				this.emit('error', err);
			}
		});
	}
}

const tty = new SerialPort({path: '/dev/ttyUSB0', baudRate: 9600, parity: 'n', dataBits: 8, stopBits: 1});
const electricityMeter = new SmartMeter(tty, 42238374);

// Log into syslog
electricityMeter.on('power', (pwr) => console.log(`Power consumption ${pwr}W`));
electricityMeter.on('error', (err) => console.error(err.message));

// Expose consumption onto the bus
module.exports = [
	// Current values from electricity meter
	[require('ftrm-basic/from-event'), {
		name: 'electricitymeter',
		output: {
			'totalEnergy': 'home.haj.atf8.sj.electricitymeter.energyTotal_Wh',
			'power': 'home.haj.atf8.sj.electricitymeter.power_W'
		},
		bus: electricityMeter
	}]
];

