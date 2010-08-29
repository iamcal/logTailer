var sys = require('sys');
var http = require('http');
var url = require('url');
var cp = require('child_process');

var config = require('./config').config;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function logTailer(id){

	var self = this;

	this.id = id;
	this.buffer = "";
	this.first_line = 1;
	this.next_line = 1;
	this.lines = {};


	//
	// launch the log tailer
	//

	var args = ['-F'];
	for (var i=0; i<config.log_groups[id].length; i++) args.push(config.log_groups[id][i]);

	this.proc = cp.spawn('tail', args);

	this.proc.stderr.on('data', function(data){
		console.log('ERROR '+data);
	});
	this.proc.stdout.on('data', function(data){

		self.buffer += data.toString('utf8');
		self.consumeBuffer();
	});
	this.proc.on('exit', function(code){
		console.log('tailing process exited');
	});


	//
	// try and extract lines from `buffer` and stash them
	// in the lines hash.
	//

	this.consumeBuffer = function(){

		var sent = 0;

		while (1){
			var idx = self.buffer.indexOf("\n");
			if (idx == -1){
				if (sent){
					self.cleanup();
					self.emit('lines');
				}
				return;
			}

			var line = self.buffer.substr(0, idx);
			self.buffer = self.buffer.substr(idx+1);

			self.lines[self.next_line] = line;
			//console.log('added line '+self.next_line);
			self.next_line++;
			sent++;
			self.emit('line', self.next_line-1);
		}
	}

	this.cleanup = function(){

		// scrub old lines here

		var min_start = self.next_line - config.max_lines;
		if (self.first_line < min_start){
			//console.log('pruning lines from '+self.first_line+' to '+min_start);
			for (var i=self.first_line; i<min_start; i++){
				delete self.lines[i];
			}
			self.first_line = min_start;
		}
	}


	//
	// get the index to start reading from (for a new connection)
	//

	this.getLines = function(start){

		var lines = [];

		if (!start){
			start = self.next_line - config.send_on_fresh;
			if (start < self.first_line) start = self.first_line;
		}

		// are they asking to start before we have logs?
		if (start < self.first_line){
			lines.push('[skipping forward]');
			start = self.first_line;
		}

		// are they asking for stuff from the future?
		if (start > self.next_line){
			lines.push('[log server restarted]');
			start = self.first_line;
		}

		// are they asking for what's about to come?
		if (start == self.next_line){
			return [];
		}

		// they must be asking for lines we have
		for (var i=start; i<self.next_line; i++){
			lines.push(self.lines[i]);
		}

		return lines;
	}
}

sys.inherits(logTailer, process.EventEmitter);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function logServer(tailers){

	http.createServer(function (req, res){

		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Access-Control-Allow-Origin': '*',  
		});

		var _url = url.parse(req.url, true);
		var get = _url.query || {};

		// get the bit after the slash
		var id = _url.pathname.substr(1);

		if (!tailers[id]){
			res.end(JSON.stringify({ok: 0, error: 'Log not found: '+id}));
			return;
		}

		var tailer = tailers[id];

		var lines = tailer.getLines(parseInt(get.l));
		if (lines.length){
			// return right away - we have lines!
			res.end(JSON.stringify({ok: 1, lines: lines, l: tailer.next_line}));
			return;
		}

		var new_idx = tailer.next_line;
		var ended = false;
		var listener = null;
		var timer = setTimeout(function(){
			if (ended) return;
			ended = true;
			res.end(JSON.stringify({ok :1, timeout: 1}));
			tailer.removeListener('lines', listener);

		}, config.idle_timeout);

		listener = function(){
			if (ended) return;
			ended = true;
			lines = tailer.getLines(new_idx);
			res.end(JSON.stringify({ok: 1, lines: lines, l: tailer.next_line}));
			clearTimeout(timer);
		};

		tailer.on('lines', listener);

	}).listen(config.port, config.host);
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////

var tailers = {};

for (var i in config.log_groups){
	tailers[i] = new logTailer(i);
}

var server = new logServer(tailers);

