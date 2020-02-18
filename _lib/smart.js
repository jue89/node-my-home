const childProcess = require('child_process');
const util = require('util');
const qsem = require('qsem');
const exec = util.promisify(childProcess.exec);

const sem = qsem(1);

function getSmart (device) {
	return sem.limit(async () => {
		const {stdout} = await exec(`smartctl -A -n standby -f old /dev/${device}`);
		const lines = stdout.split('\n');
		const startIndex = lines.findIndex((l) => l.substr(0, 3) === 'ID#');
		const table = lines.slice(startIndex)
			.filter((l) => l !== '')
			.map((l) => l.trim().replace(/\ +/g, ' ').split(' '));
		const thead = table.shift();
		const keyIndex = thead.indexOf('ATTRIBUTE_NAME');
		const valueIndex = thead.indexOf('RAW_VALUE');
		return table.reduce((info, line) => {
			info[line[keyIndex]] = parseInt(line[valueIndex]);
			return info;
		}, {});
	});
}

module.exports = (devices) => (ftrm) => devices.map((device) => [require('ftrm-basic/inject-many'), {
	name: `smart-${device}`,
	output: {
		'Temperature_Celsius': `node.${ftrm.node}.disks.${device}.smart.temparture_degC`,
		'Reallocated_Sector_Ct': `node.${ftrm.node}.disks.${device}.smart.reallocatedSectors`,
		'Power_On_Hours': `node.${ftrm.node}.disks.${device}.smart.uptime_h`,
		'Start_Stop_Count': `node.${ftrm.node}.disks.${device}.smart.startStopCount`,
		'Current_Pending_Sector': `node.${ftrm.node}.disks.${device}.smart.pendingSectors`
	},
	logLevelInject: null,
	inject: () => getSmart(device),
	interval: 20 * 60 * 1000
}]);
