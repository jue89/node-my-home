module.exports = (ftrm) => {
	const components = [];

	// Load average
	components.push([require('ftrm-basic/inject'), {
		name: 'daemon-uptime',
		output: `node.${ftrm.node}.daemon.uptime`,
		inject: () => process.uptime(),
		interval: 5 * 60 * 1000
	}]);

	// Memory
	components.push([require('ftrm-basic/inject-many'), {
		name: 'daemon-mem',
		output: {
			'heapTotal': `node.${ftrm.node}.daemon.mem.heapTotal`,
			'heapUsed': `node.${ftrm.node}.daemon.mem.heapUsed`,
			'external': `node.${ftrm.node}.daemon.mem.external`
		},
		inject: () => process.memoryUsage(),
		interval: 5 * 60 * 1000
	}]);

	return components;
};
