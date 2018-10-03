const tsfoo = require('tsfoo');

module.exports = async (ftrm) => {
	// Open database
	const db = await tsfoo.openDB('/media/data/my-home');

	// Create multiplexer that decides to write to wich series based on the pipe
	const multiplexer = tsfoo.createMultiplexer(db);
	multiplexer.on('internalError', console.error);

	// Return config for our instance
	return [require('ftrm-basic/to-writable'), {
		input: '#',
		stream: multiplexer,
		format: (value, timestamp, src) => ({series: src.event, value, timestamp})
	}];
};

