const assert = require('assert');
const {spawn} = require('child_process');

const BASE = __filename.slice(__dirname.length + 1, -3);

module.exports = [
	[require('ftrm-basic/generic'), {
		name: 'cam-cmd',
		input: [{
			pipe: `${BASE}.cmd`,
			expire: 10 * 60 * 1000,
			logLevelExpiration: null,
			checkpoint: (obj) => {
				if (obj === null) return null;
				let {host, port, opts} = obj;
				assert(typeof host === 'string');
				assert(typeof port === 'number');
				// Default
				if (!opts) opts = '-ss 30000 -w 1920 -h 1080 -fps 25 -b 10000000';
				assert(typeof opts === 'string');
				return {host, port, opts};
			}
		}],
		output: [{
			pipe: `${BASE}.running`
		}],
		factory: (input, output) => {
			let proc;
			let procCmdline;

			async function stop () {
				if (!proc) return;
				process.kill(-proc.pid, 'SIGTERM');
				if (proc.exitCode === null) {
					// Wait for the child to exit
					await new Promise((resolve) => proc.on('exit', resolve));
				}
				proc = null;
			}

			async function start (obj) {
				// Craft cmdline
				const {host, port, opts} = obj;
				const cmdline = [
					`raspivid ${opts} -n -t 0 -o - | `,
					`gst-launch-1.0 -e fdsrc ! h264parse config-interval=-1 ! rtph264pay pt=96 config-interval=-1 ! udpsink host=${host} port=${port} sync=false`
				].join('');

				// Don't do anything if the cmdline matches and the process is still running
				if (proc && proc.exitCode === null && procCmdline === cmdline) return output[0].set(true);;

				// Make sure no process is running
				await stop();

				// Kick-off process
				procCmdline = cmdline;
				proc = spawn('sh', ['-c', procCmdline], {detached: true, stdio: 'ignore'});
				output[0].set(true);
				proc.once('exit', () => output[0].set(false));
			}

			input[0].on('change', (value) => {
				if (value === null) stop();
				else start(value);
			}).on('expire', () => stop());

			return () => stop();
		}
	}],

	[require('ftrm-http/server'), {
		name: 'cam-api',
		output: [{
			name: 'cam',
			pipe: `${BASE}.cmd`,
			convert: (x) => JSON.parse(x)
		}],
		port: 8081
	}]
]
