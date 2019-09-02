module.exports = [require('ftrm-basic/to-writable'), {
	name: 'log-to-stdout',
	input: '#',
	stream: process.stdout,
	dontCloseStream: true,
	format: (value, ts, src) => `${new Date(ts)}\t${src.event}\t${value}\n`
}];
