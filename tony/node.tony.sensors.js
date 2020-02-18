const childProcess = require('child_process');
const util = require('util');
const exec = util.promisify(childProcess.exec);

const REHEX = /^0x[0-9A-Fa-f]+$/;
const REFLOAT = /^[0-9]+\.?[0-9]*$/;

async function getIpmiSensors () {
	const {stdout} = await exec('ipmitool sensor');
	const lines = stdout.split('\n')
		.filter((line) => line !== '')
		.map((line) => line.split('|').map((cell) => cell.trim()));
	return lines.reduce((sensors, line) => {
		const key = line[0];
		let value = line[1];
		if (REHEX.test(value)) {
			value = parseInt(value, 16);
		} else if (REFLOAT.test(value)) {
			value = parseFloat(value);
		} else if (value === 'na') {
			value = null;
		}
		sensors[key] = value;
		return sensors;
	}, {});
}

module.exports = [require('ftrm-basic/inject-many'), {
	name: 'sensors',
	output: {
		'CPU0_TEMP': 'node.tony.sensors.cpuTemperature_degC',
		'CPU0_FAN': 'node.tony.sensors.cpuFan_RPM',
		'SYS_FAN1': 'node.tony.sensors.bayFanL_RPM',
		'SYS_FAN2': 'node.tony.sensors.bayFanM_RPM',
		'SYS_FAN3': 'node.tony.sensors.bayFanR_RPM',
		'P_VBAT': 'node.tony.sensors.batteryVoltage_V',
	},
	inject: () => getIpmiSensors(),
	interval: 20 * 60 * 1000
}];
