const os = require('os');
const fs = require('fs');
const path = require('path');

const readProc = (file) => {};

module.exports = (ftrm) => {
	const components = [];

	// Load average
	['avg1', 'avg5', 'avg15'].forEach((topic, n) => {
		components.push([require('ftrm-basic/inject'), {
			output: `node.os.${ftrm.node}.load.${topic}`,
			inject: () => os.loadavg()[n],
			interval: 30000 // every 30 seconds
		}]);
	});

	// Uptime
	components.push([require('ftrm-basic/inject'), {
		output: `node.os.${ftrm.node}.uptime`,
		inject: () => os.uptime(),
		interval: 60000 // every minute
	}]);

	// Memory
	if (os.platform === 'linux') {
		// Get detailed info from the /proc filesystem
		// TODO
	} else {
		// The easy implementation for non-linux systems
		components.push([require('ftrm-basic/inject'), {
			output: `node.os.${ftrm.node}.mem.free`,
			inject: () => os.freemem(),
			interval: 60000 // every minute
		}]);
		components.push([require('ftrm-basic/inject'), {
			output: `node.os.${ftrm.node}.mem.used`,
			inject: () => os.totalmem() - os.freemem(),
			interval: 60000 // every minute
		}]);
	}

	return components;
}
