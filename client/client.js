#!/usr/bin/env node

var tls = require('tls');
var md5 = require('MD5');
var fs = require('fs');
var path = require('path');

var PORT = 3546;
var SERVER_URL = 'thecodebutler.com';
var RECONNECT_TIME = 3000;
var END_STRING = 'bitbeamEOT1337#420yoloswagumshollahollagetdolla';

var body = '';
var clientSecret;
var reconnect = null;

String.prototype.endsWith = function(suffix) {
    return this.match(suffix+"$") == suffix;
};
var options = {
	host: SERVER_URL,
	port: PORT,
	ca: [fs.readFileSync(path.join(__dirname, 'tls-server.crt'))],
	rejectUnauthorized: false,
	requestCert: true,
    agent: false
}

var socket, key, printFlag = true;

var onSecureConnect = function(){
	clearInterval(reconnect);
	reconnect = null;
	if(socket.authorized === true){
		console.log('secure connection established');
		socket.setNoDelay(true);
		socket.setTimeout(30000);
		clientSecret = md5((new Date()).getTime() + Math.floor((Math.random() * 100) + 1) + 'shhh');
		if(!key) key = md5((new Date()).getTime() + Math.floor((Math.random() * 111) + 1) + 'shhhmore');
		socket.write(JSON.stringify({type: 'connect', key: key, secret: clientSecret}));
		socket.write(END_STRING);
		var url = 'http://' + SERVER_URL + '/' + key + '/'
		if(printFlag){
			printFlag = false;
			console.log('access this directory at: \n' + url);
			if(process.platform.indexOf('win') !== -1){
				var exec = require('child_process').exec;
				exec('start /max ' + url, function (error, stdout, stderr) {});
			}
		}
	}else{
		console.log('error connecting to server');
		console.log(socket.authorizationError);
	}
}
var onError = function(e){
	console.log('error, reconnecting');
	console.log(e);
	if(reconnect === null){
		reconnect = setInterval(function(){
			socket.destroy();
			beginConnectionLoop();
		}, RECONNECT_TIME);
	}
}
var onClose = function(){
	console.log('close, reconnecting');
	if(reconnect === null){
		reconnect = setInterval(function(){
			socket.destroy();
			beginConnectionLoop();
		}, RECONNECT_TIME);
	}
}

var onTimeout = function(){
	socket.write('heartbeat');
	socket.write(END_STRING);
	if(reconnect === null){
		reconnect = setInterval(function(){
			socket.destroy();
			beginConnectionLoop();
		}, RECONNECT_TIME);
	}
}

var onData = function(data){
	if(!data.toString().endsWith(END_STRING)){
		body += data.toString()
	}else{
		body += data.toString().substring(0, data.toString().indexOf(END_STRING));
		onCompleteData(body);
		body = '';
	}
}

var onCompleteData = function(data){
	clearInterval(reconnect);
	reconnect = null;
	var payload = JSON.parse(data);
	if(payload.secret === clientSecret){
		if(payload.command === 'testSuccess') return;
		else if(payload.command === 'areyouthere'){
			socket.write(JSON.stringify({type: 'areyouthere', areyouthere: true})); 
			socket.write(END_STRING);
		}else if(payload.command === 'ls'){
			fs.readdir(path.join(process.cwd(), payload.path), function(err, fileNames){
				if(err){
					console.log(err);
					socket.write(JSON.stringify({type: 'ls', error: err}));
					socket.write(END_STRING);
				}else{
					var files = [];
					var folders = [];
					for(var i=0; i<fileNames.length; i++){
						var file = {};
						file.name = fileNames[i];
						var ext = path.extname(file.name||'').split('.');
						file.extension = ext[ext.length - 1];
						try{
							var stats = fs.statSync(path.join(process.cwd(), payload.path, fileNames[i]));
							file.isDir = stats.isDirectory();
							file.size = stats.size;
							file.ctime = stats.ctime;
							file.mtime = stats.mtime;
							if(file.isDir) files.push(file);
							else folders.push(file);
						}catch(e){
							console.log(e);
						}
					};
					for(var i=0; i<folders.length; i++){
						files.push(folders[i]);
					}
					socket.write(JSON.stringify({type: 'ls', files: files}));
					socket.write(END_STRING);
				}
			});
		}else if(payload.command === 'file'){
			fs.readFile(path.join(process.cwd(), payload.path), function(err, data){
				if(err) socket.write(JSON.stringify({type: 'file', err: err}));
				else socket.write(JSON.stringify({type: 'file', text: data.toString()}));
				socket.write(END_STRING);
			});
		}else if(payload.command === 'save'){
			fs.writeFile(path.join(process.cwd(), payload.path), payload.text, function (err) {
				if(err) socket.write(JSON.stringify({type: 'save', err: err}));
				else socket.write(JSON.stringify({type: 'save', err: null}));
				socket.write(END_STRING);
			});
		}else{
			console.log('unrecognized command: ' + payload.command);
		}
	}else{
		console.log('bad secret: ' + payload.secret);
	}
}

var beginConnectionLoop = function(){
	socket = tls.connect(options);
	socket.on('secureConnect', onSecureConnect);
	socket.on('error', onError);
	socket.on('close', onClose);
	socket.on('timeout', onTimeout);
	socket.on('data', onData);
}

beginConnectionLoop();