const childProcess = require('child_process');
const util = require('util');
const exec = util.promisify(childProcess.exec);

const getZpoolStatus = async (pool) => {
	const {stdout} = await exec(`zpool list -p -H ${pool}`);
	const stats = stdout.trim().split('\t');
	return {
		'SIZE': parseInt(stats[1]),
		'FREE': parseInt(stats[2]),
		'ONLINE': stats[9] === 'ONLINE'
	}
};

module.exports = [require('ftrm-basic/inject-many'), {
	name: 'zpool-tank',
	output: {
		'SIZE': 'node.ned.volumes.tank.size',
		'FREE': 'node.ned.volumes.tank.free',
		'ONLINE': 'node.ned.volumes.tank.online'
	},
	inject: () => getZpoolStatus('tank'),
	interval: 20 * 60 * 1000
}];
