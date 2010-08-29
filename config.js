
exports.config = {

	//
	// for each different log (or set of logs) you want to tail,
	// add an item here. if the name is 'messages', then the URL
	// will be http://{host}:{port}/messages. specify multiple
	// files to tail them together
	//

	files : {
		'messages'	: ['/var/log/messages'],
		'access'	: ['/var/log/httpd/access_log'],
		'combined'	: ['/var/log/httpd/access_log', '/var/log/httpd/error_log'],
	},


	//
	// how many lines should we buffer in memory to allow slow
	// or paused client to catch up. this is per log group.
	//
	max_lines : 100,


	//
	// when a new client first connects, how many lines should
	// we send them (can't be more than max_lines).
	//
	send_on_fresh : 20,


	//
	// timeout (in milliseconds) for long-poll clients. probably
	// don't need to adjust this one.
	//
	idle_timeout: 10000, // 10s
};
