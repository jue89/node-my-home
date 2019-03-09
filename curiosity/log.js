module.exports = [require('ftrm-basic/to-writable'), {
	input: '#',
	stream: process.stdout,
	dontCloseStream: true,
	format: (value, ts, src) => {
		let padding = 80 - src.event.length;
		if (typeof value == 'number') value = value.toFixed(2);
		else value = value.toString();
		padding -= value.length;
		if (padding < 1) padding = 1;
		return `${src.event}${' '.repeat(padding)}${value.toString()}\n`;
	}
}];
