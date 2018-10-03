module.exports = (ftrm) => {
	const components = [];

	// Load average
	components.push([require('ftrm-basic/inject'), {
		output: `node.daemon.${ftrm.node}.uptime`,
		inject: () => process.uptime(),
		interval: 60000
	}]);

	// Memory
	['heapTotal', 'heapUsed', 'external'].forEach((type) => {
		components.push([require('ftrm-basic/inject'), {
			output: `node.daemon.${ftrm.node}.mem.${type}`,
			inject: () => process.memoryUsage()[type],
			interval: 60000
		}]);
	});

	return components;
};
