const hdpFactory = require('homie-dgram');

// Sigleton for HDPClient
let hdpClient;
module.exports = () => {
	if (!hdpClient) {
		hdpClient = hdpFactory();
		hdpClient.then((client) => client.triggerDiscovery());
	}
	return hdpClient;
};
