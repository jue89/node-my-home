const getMdstat = require('../_lib/mdstat.js');
module.exports = [require('ftrm-basic/inject'), {
	name: 'mdstat-md0',
	output: 'node.srv2.volumes.md0.online',
	inject: () => getMdstat('md0'),
	interval: 20 * 60 * 1000
}];
