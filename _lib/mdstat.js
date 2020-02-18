const fs = require('fs');
const util = require('util');
const assert = require('assert');
const readFile = util.promisify(fs.readFile);

const RESTATE = /\[([U_]+)\]/;

module.exports = async (volume) => {
	const mdstat = await readFile('/proc/mdstat');
	const lines = mdstat.toString().split('\n');
	const needle = new RegExp(`^${volume}`);
	const startIdx = lines.findIndex((line) => needle.test(line));
	assert(startIdx > -1, `${volume} not found`);
	const stateLine = lines[startIdx + 1];
	const state = RESTATE.exec(stateLine)[1];
	assert(state, 'Cannot decode state');
	const failed = state.replace(/U/g, '').length;
	return failed === 0;
};
