const fs = require('fs');
const os = require('os');
const path = require('path');

const store = process.env.STORE || path.join(os.homedir(), '.my-home.state.json');

try {
	module.exports = JSON.parse(fs.readFileSync(store).toString());
} catch (e) {
	module.exports = {};
}

Object.setPrototypeOf(module.exports, {
	save: function () {
		fs.writeFileSync(store, JSON.stringify(this, null, '\t'));
	}
});

setInterval(() => module.exports.save(), 30 * 60 * 1000);
process.on('SIGINT', () => module.exports.save());
process.on('SIGTERM', () => module.exports.save());
