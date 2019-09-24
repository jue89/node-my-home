module.exports = [
	[require('ftrm-basic/to-writable'), {
		name: 'log-to-stdout',
		input: [{pipe: '#'}],
		stream: process.stdout,
		dontCloseStream: true,
		format: (value, ts, src) => `${new Date(ts)}\t${src.pipe}\t${value}\n`
	}]
];
