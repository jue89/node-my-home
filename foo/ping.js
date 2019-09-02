module.exports = [require('ftrm-basic/inject'), {
	name: 'ping',
	output: 'ping',
	inject: () => true,
	interval: 1000
}];
