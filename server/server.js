var tls = require('tls');
var fs = require('fs');
var exec = require('child_process').exec;
var baseServer = require('./lib/server.js');
var path = require('path');
var storage = baseServer.storage;

const SERVER_URL = 'bitbeam.info';
const TLS_PORT = 3546;
const END_STRING = 'bitbeamEOT1337#420yoloswagumshollahollagetdolla';
const BASE_INSTALLER_C_PATH = './installer/installer.c';
var socketMap = {};

String.prototype.endsWith = function(suffix) {
    return this.match(suffix+"$") == suffix;
};

var getMachine = function(userId, machineName, cb){
	storage.getUserData(userId, function(err, userData){
		if(err) cb(err, null);
		else{
			for(var i=0; i<userData.machines.length; i++){
				if(userData.machines[i].name === machineName){
					cb(err, userData.machines[i]);
					return;
				}
			}
			cb(err, null);
		}
	});
}

baseServer.init(require('./config'));

baseServer.onUserCreated(function(userId){
	storage.saveUserData(userId, {machines: []}, function(err, result){});
});

baseServer.configure(function(app){
	app.use("/static/install", baseServer.express.static(__dirname + "/public/install"));
	app.use("/static/js", baseServer.express.static(__dirname + "/public/js"));
	app.use("/static/css", baseServer.express.static(__dirname + "/public/css"));
	app.use("/static/img", baseServer.express.static(__dirname + "/public/img"));
	app.use("/static/templates", baseServer.express.static(__dirname + "/public/templates"));
	app.use("/static/views", baseServer.express.static(__dirname + "/public/views"));
	app.set('views', __dirname + '/public/pages');
	app.use(function(req, res, next){
		if(!req.secure) res.redirect('https://' + SERVER_URL + req.url);
		else next();
	})
});

baseServer.register(function(app){
	app.get('/machine', function(req, res){
		if(req.session.user) {
			if(req.param('machineName')){
				getMachine(req.session.user, req.param('machineName'), function(err, machine){
					if(err) res.json(500, {});
					if(!machine.name) res.json(200, {});
					else res.json(200, machine);
				});
			}else res.send(400, 'invalid parameters');
		}else res.send(400, 'not authed');
	});

	app.get('/machines', function(req, res){
		if(req.session.user) {
			storage.getUserData(req.session.user, function(err, userData){
				if(err) res.send(500, err);
				var userMachines = userData.machines;
				var results = [];
				var timeout;
				if(userMachines.length !== 0){
					userMachines.forEach(function(machine, i){
						results.push({machineName: machine.name});
						var socket = socketMap[(machine.key)];
						if(!socket) results[i].available = false;
						else{						
							socket.once('json', function(payload){
								results[i].available = payload.areyouthere;
							});
							socket.write(JSON.stringify({command: 'areyouthere', secret: socket.bitbeamSecret}));
							socket.write(END_STRING);
						}
					});
					timeout = setTimeout(function(){
						for(var i=0; i<results.length; i++){
							if(results[i].available === undefined) results[i].available = false; 
						}
						console.log(results);
						res.json(200, results);
					}, 1000);
				}else res.json(200, results);
			});
		}else res.send(400, 'not authed');
	});

	app.get('/ls', function(req, res) {
		if(req.session.user) {
			if(req.param('machineName') && req.param('path')){
				getMachine(req.session.user, req.param('machineName'), function(err, machine){
					if(err) res.send(500, err);
					if(!machine) res.send(500, 'device does not exist');
					else{
						var key = machine.key;
						if(!key || !socketMap[key]) res.send(500, 'device not connected: ' + req.param('machineName'));
						else{
							var socket = socketMap[key];
							socket.once('json', function(body){
								console.log(body);
								res.json(200, body);
								socket.removeListener('error', onError)
							});
							var onError = function(e){
								console.log('error on ls');
								console.log(e);
								res.send(500, 'error performing ls');
							}
							socket.once('error', onError);
							socket.write(JSON.stringify({command: 'ls', path: req.param('path'), secret: socket.bitbeamSecret}));
							socket.write(END_STRING);
						}
					}
				});
			}else res.send(400, 'invalid parameters');
		}else res.send(401, 'not authed');
	});

	app.get('/file', function(req, res){
		if(req.session.user) {
			if(req.param('machineName') && req.param('path')){
				res.setHeader('Content-Disposition', 'attachment; filename=' + path.basename(req.param('path')));
				getMachine(req.session.user, req.param('machineName'), function(err, machine){
					if(err) res.send(500, err);
					if(!machine) res.send(500, 'device does not exist');
					else{
						var key = machine.key;
						if(!key || !socketMap[key]) res.send(500, 'device not connected: ' + req.param('machineName'));
						else{
							var socket = socketMap[key];
							socket.once('end', function(){
								console.log('file pipe ended');
								socket.unpipe();
								socket.removeListener('error', onError)
							});
							socket.once('error', function(e){
								console.log('error on file');
								console.log(e)
								res.send(500, 'error performing file');
							});
							socket.pipe(res);
							socket.write(JSON.stringify({command: 'file', path: req.param('path'), secret: socket.bitbeamSecret}));
							socket.write(END_STRING);
						}
					}
				});
			}else res.send(400, 'invalid parameters');
		}else res.send(400, 'not authed');
	});
	
	app.post('/installer/claim', function(req, res){
		if(req.session.user) {
			if(req.param('machineName') && req.param('key')){
				storage.accessUserData(function(collection){
					collection.findOne({'data.machines.key': req.param('key')}, function(err, result){
						if(err) res.send(500, err);
						else if(result) res.send(400, 'machine already claimed');
						else{
							collection.update(
								{userId: req.session.user},
								{'$push': {'data.machines': {name: req.param('machineName'), key: req.param('key')}}}, 
								{upsert: true, multi: false},
								function(result){
									res.send(200, 'machine registered successfully');
								}
							);
						}
					});
				});
			}else res.send(400, 'invalid parameters');
		}else res.send(400, 'not authed');
	});
	
	app.get('/installer/unregister', function(req, res){
		if(req.session.user) {
			if(req.param('machineName')){
				storage.accessUserData(function(collection){
					collection.update(
						{userId: req.session.user},
						{'$pull': {'data.machines': {name: req.param('machineName')}}}, 
						{upsert: false, multi: false},
						function(err, result){
							res.send(200, 'machine unregistered successfully');
						}
					);
				});
			}else res.send(400, 'invalid parameters');
		}else res.send(400, 'not authed');
	});
	
	app.get('/installer/uninstall', function(req, res){
		if(req.param('key')){
			storage.accessUserData(function(collection){
				collection.update(
					{'data.machines.key': req.param('key')},
					{'$pull': {'data.machines': {key: req.param('key')}}}, 
					{upsert: false, multi: false},
					function(err, result){
						res.send(200, 'machine unregistered successfully');
					}
				);
			});
		}else res.send(400, 'invalid parameters');
	});
	
	app.get('/installer/download', function(req, res){
		res.download('./bitbeam.exe', 'bitbeam.exe');
	});
	
	app.get('/', function(req, res){
		if(req.session.user) res.sendfile('public/pages/index.html');
		else res.sendfile('public/pages/home.html');
	});
});

var options = {
	key: fs.readFileSync('./cert/tls-server.key'),
	cert: fs.readFileSync('./cert/tls-server.crt')
};

var tlsServer = tls.createServer(options, function(socket) {
	var body = '';
	socket.on('data', function(data){
		if(!data.toString().endsWith(END_STRING)){
			body += data.toString()
		}else{
			body += data.toString().substring(0, data.toString().indexOf(END_STRING));
			socket.emit('completeData', body);
			body = '';
		}
	});
	socket.on('completeData', function(data){
		if(data.toString() === 'heartbeat'){
			socket.write(JSON.stringify({command: 'testSuccess', secret: socket.bitbeamSecret}));
			socket.write(END_STRING);
		}else{
			try{
				socket.emit('json', JSON.parse(data));
			}catch(e){
				console.log('bad message from socket ' + socket.bitbeamKey);
			}
		}
	});
	socket.once('json', function(payload){
		socket.bitbeamKey = payload.key;
		socket.bitbeamSecret = payload.secret;
		console.log('socket connected ' + socket.bitbeamKey);
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