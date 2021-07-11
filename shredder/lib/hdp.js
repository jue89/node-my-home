const hdpFactory = require('homie-dgram');

// Sigleton for HDPClient
let hdpClient;
module.exports = () => {
	if (!hdpClient) {
		hdpClient = hdpFactory({iface: 'homie0'});
		hdpClient.then((client) => client.triggerDiscovery());
	}
	return hdpClient;
};
