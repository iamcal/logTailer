function log_handler(name, url, parent){

	var self = this;

	this.url = url;
	this.parent = parent;
	this.name = name;

	this.header = $('<div class="header"></div>').appendTo(parent);
	this.playback = $('<a href="#"></a>').text('Pause').appendTo($('<div class="buttons"></div>').appendTo(this.header));
	this.header.append($('<h2></h2>').text(name));
	this.screen = $('<div class="screen"></div>').appendTo(parent);
	this.screen.html('<div></div>');

	this.playback.click(function(){
		self.clicked(); 
		return false;
	});

	this.lx = 1;
	this.lines = {};
	this.line_keys = [];
	this.max_lines = 50;
	this.idx = 0;

	this.paused = false;
	this.inflight = null;

	this.addLine = function(line, repaint){

		var id = self.lx++;

		self.line_keys.push(id);
		self.lines[id] = $('<div/>').text(line).html();

		if (self.line_keys.length > self.max_lines){
			var dkey = self.line_keys.shift();
			delete self.lines[dkey];
		}

		if (repaint) self.repaint();

		return id;
	};

	this.repaint = function(){

		var buffer = "";
		var l = self.line_keys.length;

		for (var i=0; i<l; i++){
			buffer += self.lines[self.line_keys[i]] + "\n";
		}

		self.screen.find('div').html(buffer);
		self.screen.scrollTop(self.screen[0].scrollHeight);
	};

	this.onLoaded = function(o, success, req){

		self.inflight = null;

		// if we've been pause, we ignore this response - we'll
		// send it again once we unpause
		if (self.paused) return;

		if (!o){
			if (!req.status){
				self.addLine('[ERROR] Can\'t connect to log server', 1);
			}else{
				self.addLine('[ERROR] Error from log server: '+req.status, 1);
			}
			self.pause();
			return;
		}

		if (!o.ok){
			self.addLine('[ERROR] '+o.error);
			self.pause();
			return;
		}

		if (o.lines){
			for (var i=0; i<o.lines.length; i++){
				self.addLine(o.lines[i]);
			}
			self.repaint();
		}

		if (o.l){
			self.idx = o.l;
		}

		if (!self.paused){
			window.setTimeout(function(){ self.pumpLog(); }, 0);
		}
	};

	this.onError = function(req, status, ex){

		self.addLine('[ERROR] '+status, 1);
		self.pause();
	};

	this.pumpLog = function(){

		self.inflight = $.ajax({
			url: self.url+'?l='+self.idx,
			success: this.onLoaded,
			error: this.onError,
			dataType: 'json',
		});
	};

	this.pause = function(){

		if (self.paused) return;
		self.paused = true;

		// make sure the request we're running now never completes
		if (self.inflight){
			self.inflight.success = null;
			self.inflight.error = null;
		}

		self.playback.text('Resume');

		self.addLine('--paused--', 1);
	};

	this.resume = function(){

		if (!self.paused) return;
		self.paused = false;

		self.playback.text('Pause');
		self.pumpLog();

		self.addLine('--resumed--', 1);
	}

	this.clicked = function(){
		if (self.paused){
			self.resume();
		}else{
			self.pause();
		}
	}

	this.repaint();
	this.pumpLog();
}