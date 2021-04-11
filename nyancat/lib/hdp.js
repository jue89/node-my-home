const hdpFactory = require('homie-dgram');

// Sigleton for HDPClient
let hdpClient;
module.exports = () => {
	if (!hdpClient) hdpClient = hdpFactory();
	return hdpClient;
};
