const os = require('os');
const fs = require('fs');
const path = require('path');

const readProc = async (file) => new Promise((resolve, reject) => {
	fs.readFile(path.join('/proc', file), (err, data) => {
		if (err) reject(err);
		else resolve(data.toString());
	});
});;

module.exports = (ftrm) => {
	const components = [];

	// Load average
	const loadNames = ['avg1', 'avg5', 'avg15'];
	components.push([require('ftrm-basic/inject-many'), {
		name: 'load',
		output: loadNames.reduce((output, name) => {
			output[name] = `node.${ftrm.node}.os.load.${name}`
			return output;
		}, {}),
		inject: () => os.loadavg().reduce((load, value, n) => {
			load[loadNames[n]] = value;
			return load;
		}, {}),
		interval: 1 * 60 * 1000
	}]);

	// Uptime
	components.push([require('ftrm-basic/inject'), {
		name: 'os-uptime',
		output: `node.${ftrm.node}.os.uptime`,
		inject: () => os.uptime(),
		interval: 5 * 60 * 1000
	}]);

	// Memory
	if (os.platform() === 'linux') {
		// Get detailed info from the /proc filesystem
		const REmem = /^([a-zA-Z]+): *([0-9]+) kB$/;
		components.push([require('ftrm-basic/inject-many'), {
			name: 'mem',
			output: {
				'used': `node.${ftrm.node}.os.mem.used`,
				'free': `node.${ftrm.node}.os.mem.free`,
				'buffers': `node.${ftrm.node}.os.mem.buffers`,
				'cached': `node.${ftrm.node}.os.mem.cached`,
				'swapused': `node.${ftrm.node}.os.mem.swapused`,
				'swapfree': `node.${ftrm.node}.os.mem.swapfree`
			},
			inject: () => readProc('meminfo').then((file) => {
				const mem = file.split('\n')
					.map((line) => REmem.exec(line))
					.filter((line) => line)
					.reduce((data, line) => {
						data[line[1]] = parseInt(line[2]) * 1024;
						return data;
					}, {});

				return {
					'used': mem.MemTotal - mem.MemFree,
					'free': mem.MemFree,
					'buffers': mem.Buffers,
					'cached': mem.Cached,
					'swapused': mem.SwapTotal - mem.SwapFree,
					'swapfree': mem.SwapFree
				};
			}),
			interval: 5 * 60 * 1000
		}]);
	} else {
		// The easy implementation for non-linux systems
		components.push([require('ftrm-basic/inject-many'), {
			name: 'mem',
			output: {
				'free': `node.${ftrm.node}.os.mem.free`,
				'used': `node.${ftrm.node}.os.mem.used`
			},
			inject: () => {
				const total = os.totalmem();
				const free = os.freemem();
				return {free, used: total - free};
			},
			interval: 5 * 60 * 1000
		}]);
	}

	return components;
}
