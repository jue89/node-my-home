const os = require('os');
const fs = require('fs');
const path = require('path');
const FTRM = require('ftrm');

// Dry run
const dryRun = process.argv[2] === '--check';

// Helper for loading the PKI stuff
const getPem = (file) => fs.readFileSync(path.join(__dirname, '_pki', file));

// By default use the hostname as node name
const node = process.env.NODE || os.hostname();
const logScope = process.env.LOGSCOPE || 'local';
const logSink = (process.stdout.isTTY) ? 'stdout' : 'journal';
FTRM({
	ca: getPem(`my-home.crt`),
	cert: getPem(`my-home.${node}.crt`),
	key: getPem(`my-home.${node}.key`),
	autoRunDir: path.join(__dirname, node),
	log: `${logScope}-${logSink}`,
	node,
	dryRun
});
