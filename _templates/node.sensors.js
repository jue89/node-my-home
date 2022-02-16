const assert = require('assert');
const childProcess = require('child_process');
const util = require('util');
const qsem = require('qsem');
const exec = util.promisify(childProcess.exec);

const sem = qsem(1);

piTempRe = /^temp=([0-9\.]+)'C/;
const getPiTemp = () => sem.limit(async () => {
	const {stdout} = await exec('vcgencmd measure_temp');
	assert(stdout);
	const re = piTempRe.exec(stdout.toString());
	assert(re);
	return parseFloat(re[1]);
});

module.exports = (ftrm) => Promise.allSettled([
	getPiTemp().then(() => [require('ftrm-basic/inject'), {
		name: 'core-temp',
		output: `node.${ftrm.node}.sensors.cpuTemperature_degC`,
		inject: getPiTemp,
		interval: 3 * 60 * 1000
	}])
]).then((components) => components
	.filter(({status}) => status === 'fulfilled')
	.map(({value}) => value)
);

