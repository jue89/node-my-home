module.exports = (ftrm) => {
	const components = [];

	// Load average
	components.push([require('ftrm-basic/inject'), {
		output: `node.daemon.${ftrm.node}.uptime`,
		inject: () => process.uptime(),
		interval: 60000
	}]);

	// Memory
	components.push([require('ftrm-basic/inject-many'), {
		output: {
			'heapTotal': `node.daemon.${ftrm.node}.mem.heapTotal`,
			'heapUsed': `node.daemon.${ftrm.node}.mem.heapUsed`,
			'external': `node.daemon.${ftrm.node}.mem.external`
		},
		inject: () => process.memoryUsage(),
		interval: 60000
	}]);

	return components;
};
