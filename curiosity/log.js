const Journal = require('systemd-journald');
const log = new Journal({syslog_identifier: 'my-home'});

module.exports = [require('ftrm-basic/generic'), {
	name: 'log-to-journal',
	input: [{pipe: '#', spy: true}],
	factory: (i) => {
		const log = new Journal({syslog_identifier: 'my-home'});
		i[0].on('update', (value, timestamp, src) => {
			if (typeof value == 'number') value = value.toFixed(2);
			const pipe = src.event;
			log.debug(`${pipe.padEnd(90)} ${value}`, {pipe});
		});
	}
}];
