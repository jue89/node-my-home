const FTRM = require('ftrm');

// This is boring since the defaults are handling everything ...
FTRM();

// Things that are happening here:
// - Get the local hostname and look for a folder with the same name
// - Load key and certificate from that folder
// - Load all .js files from that folder
