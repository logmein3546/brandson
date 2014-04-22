var neverdrop = require('neverdrop');
var fs = require('fs');
var exec = require('child_process').exec;
var baseServer = require('./lib/server.js');
var path = require('path');
var storage = baseServer.storage;

const SERVER_URL = 'thecodebutler.com';
const TLS_PORT = 3546;
var socketMap = {};

baseServer.init(require('./config'));

baseServer.configure(function(app){
	app.use("/static/install", baseServer.express.static(__dirname + "/public/install"));
	app.use("/static/js", baseServer.express.static(__dirname + "/public/js"));
	app.use("/static/css", baseServer.express.static(__dirname + "/public/css"));
	app.use("/static/img", baseServer.express.static(__dirname + "/public/img"));
	app.use("/static/templates", baseServer.express.static(__dirname + "/public/templates"));
	app.use("/static/views", baseServer.express.static(__dirname + "/public/views"));
	app.use("/static/pages", baseServer.express.static(__dirname + "/public/pages"));
	app.set('views', __dirname + '/public/pages');
});

baseServer.register(function(app){
	app.get('/ls', function(req, res) {
		console.log('ls: ', req.param('path'));
		if(req.param('path') && req.param('machineName')){
			var socket = socketMap[req.param('machineName')];
			if(!socket) res.send(500, 'device not connected: ' + req.param('machineName'));
			else{
				socket.once('ls', function(payload){
					console.log(payload);
					res.json(200, payload.files);
					socket.removeListener('error', onError);
				});
				var onError = function(e){
					console.log('error on ls');
					console.log(e);
					res.send(500, 'error performing ls');
				}
				socket.once('error', onError);
				socket.message(JSON.stringify({command: 'ls', path: req.param('path')}));
			}
		}else res.send(400, 'invalid parameters');
	});

	app.get('/file', function(req, res){
		console.log('file: ', req.param('path'));
		if(req.param('path') && req.param('machineName')){
			var socket = socketMap[req.param('machineName')];
			if(!socket) res.send(500, 'device not connected: ' + req.param('machineName'));
			else{
				socket.once('file', function(payload){
					console.log('pay:', payload);
					if(payload.err) res.send(500, payload.err);
					else res.send(201, payload.text);
					socket.removeListener('error', onError);
				});
				var onError = function(e){
					console.log('error on file');
					console.log(e)
					res.send(500, 'error performing file');
				}
				socket.once('error', onError);
				socket.message(JSON.stringify({command: 'file', path: req.param('path')}));
			}
		}else res.send(400, 'invalid parameters');
	});
	
	app.post('/save', function(req, res){
		if(req.param('path') && req.param('machineName') && req.param('text')){
			var socket = socketMap[req.param('machineName')];
			if(!socket) res.send(500, 'device not connected: ' + req.param('machineName'));
			else{
				socket.once('save', function(payload){
					if(payload.err) res.send(500, payload.err);
					else res.send(200, 'file saved');
					socket.removeListener('error', onError);
				});
				var onError = function(e){
					console.log('error on save');
					console.log(e);
					res.send(500, 'error performing save');
				}
				socket.once('error', onError);
				socket.message(JSON.stringify({command: 'save', path: req.param('path'), text: req.param('text')}));
			}
		}else res.send(400, 'invalid parameters');
	});
	
	app.get('/', function(req, res){
		res.sendfile('public/pages/home.html');
	});
	
	app.get('/:session/*', function(req, res){
		if(req.param('session')){
			if(socketMap[req.param('session')]) res.sendfile('public/pages/index.html');
			else res.sendfile('public/pages/error.html');
		}else res.send(400, 'invalid parameters');
	});
	
	app.get('/:session', function(req, res){
		if(req.param('session')){
			if(socketMap[req.param('session')]) res.sendfile('public/pages/index.html');
			else res.sendfile('public/pages/error.html');
		}else res.send(400, 'invalid parameters');
	});
});

var options = {
	key: fs.readFileSync('./cert/tls-server.key'),
	cert: fs.readFileSync('./cert/tls-server.crt'),
	rejectUnauthorized: false
};

var tlsServer = neverdrop.createServer(options, function(socket) {
	socket.on('message', function(data){
		try{
			var json = JSON.parse(data);
			if(json.type === 'ls') socket.emit('ls', JSON.parse(data));
			else if(json.type === 'file') socket.emit('file', JSON.parse(data));
			else if(json.type === 'save') socket.emit('save', JSON.parse(data));
			else if(json.type === 'connect') socket.emit('connect', JSON.parse(data));
		}catch(e){
			console.log('bad message from socket ' + socket.bitbeamKey);
			console.log(e);
			console.log(data);
		}
	});
	socket.once('connect', function(payload){
		console.log('connect:', payload);
		socket.bitbeamKey = payload.key;
		socketMap[(payload.key)] = socket;
	});
	socket.setTimeout(1200000, function(){
		console.log('timeout on socket ' + socket.bitbeamKey);
		socket.destroy();
		delete socket[(socket.bitbeamKey)];
	});
	socket.on('error',  function(e){
		console.log('error on socket ' + socket.bitbeamKey);
		console.log(e);
	});
});

tlsServer.listen(TLS_PORT, function() {
  console.log('tls server litening on port ' + TLS_PORT);
});

baseServer.listen();