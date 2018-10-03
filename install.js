const fs = require('fs');

const service = `
[Unit]
Description=My Home Service
After=network.target
[Service]
Type=simple
ExecStart=${process.execPath} ${__dirname}
Restart=on-failure
[Install]
WantedBy=multi-user.target
`;

fs.writeFileSync('/etc/systemd/system/my-home.service', service);
console.log('Installed service file');
console.log('Please exec: systemctl enable my-home; systemctl start my-home');
