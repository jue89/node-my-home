const BASE = __filename.slice(__dirname.length + 1, -3);
const localStorage = require('../_lib/localStorage.js');
const {EventEmitter} = require('events');
const {Gpio} = require('onoff');

class ElectricityMeter extends EventEmitter {
	constructor ({gpio, WhPerPulse, energy}) {
		super();

		this.energy = energy || 0;
		this.power = undefined;
		this.gpio = new Gpio(gpio, 'in', 'falling');

		const WsPerPulse = WhPerPulse * 60 * 60;
		let checkpoint;
		this.gpio.watch(() => {
			// Accumulate energy
			this.energy += WhPerPulse;

			// Calc power
			const now = process.hrtime.bigint();
			if (checkpoint) {
				const diff = Number((now - checkpoint) / 1000000n) / 1000;
				this.power = WsPerPulse / diff;
			}
			checkpoint = now;

			this.emit('update', this);
		});
	}

	close () {
		this.gpio.unexport();
	}
}


module.exports = [
	[require('ftrm-basic/generic'), {
		name: 'electricitymeter',
		output: {
			totalEnergy: `${BASE}.energyTotal_Wh`,
			power: `${BASE}.power_W`,
		},
		factory: (i, o) => {
			const em = new ElectricityMeter({
				gpio: 17,
				WhPerPulse: 0.5, // 2000 pulses per kWh
				energy: localStorage.energy_Wh
			});

			em.on('update', ({energy, power}) => {
				localStorage.energy_Wh = energy;
				o.totalEnergy.value = energy;
				if (power) o.power.value = power;
			});

			return () => em.close();
		}
	}],
];
