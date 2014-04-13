/*
Goals:
	Log in with Google
	Map users with an object (permanent or non permanent)
	Request user data
*/

var express = require("express");
var connect = require('connect');
var http = require('http');
var https = require('https');
var fs = require('fs');
var md5 = require('MD5');
var qs = require('querystring');
var request = require('request');
var MongoClient = require('mongodb').MongoClient;

var DEBUG;

var HOST;
var HTTP_PORT;
var HTTPS_PORT;

var IS_PERSISTENT;
var MONGO_URL;
var DATABASE_NAME;

var IS_SECURE;
var SSL_KEY_PATH;
var SSL_CERTIFICATE_PATH;

var SECRET_KEY;
var GOOGLE_CLIENT_ID;
var GOOGLE_CLIENT_SECRET;
var REDIRECT_PATH;
var REDIRECT_URL;
var GOOGLE_AUTH_URL;
var GOOGLE_TOKEN_URL;
var GOOGLE_INFO_REQUEST_URL;
var AUTH_PATH;
var AUTH_SUCCESS_PATH;
var DEFAULT_OBJECT_ARRAY;

var app = express();
var map = {};
var getUserData, saveUserData, accessUserData, accessDatabase;

var init = function(config){
	DEBUG = config.debug;

	HOST = config.host;
	HTTP_PORT = config.httpPort;
	HTTPS_PORT = config.httpsPort;

	IS_PERSISTENT = config.isPersistent;
	MONGO_URL = config.mongoUrl;
	DATABASE_NAME = config.databaseName;

	IS_SECURE = config.isSecure;
	SSL_KEY_PATH = config.sslKeyPath;
	SSL_CERTIFICATE_PATH = config.sslCertificatePath;

	SECRET_KEY = config.secretKey;
	GOOGLE_CLIENT_ID = config.googleClientId;
	GOOGLE_CLIENT_SECRET = config.googleClientSecret;
	REDIRECT_PATH = config.redirectPath;
	REDIRECT_URL = 'http://' + HOST + ':' + ((IS_SECURE) ? HTTPS_PORT : HTTP_PORT)  + REDIRECT_PATH;
	GOOGLE_AUTH_URL = config.googleAuthUrl;
	GOOGLE_TOKEN_URL = config.googleTokenUrl;
	GOOGLE_INFO_REQUEST_URL = config.googleInfoRequestUrl;
	AUTH_PATH = config.authPath;
	AUTH_SUCCESS_PATH = config.authSuccessPath;
	DEFAULT_OBJECT_ARRAY = config.defaultObjectArray;
	
	/*-------------------------------Data Storage---------------------------------*/

	if (IS_PERSISTENT) {
		MongoClient.connect(MONGO_URL + DATABASE_NAME, function(err, db) {
			if(err) throw err;
	
			getUserData = function(userId, cb) {
				var collection = db.collection('users');
				console.log(userId);
				collection.findOne({userId: userId}, {_id: 0}, function(err, doc) {
					if(DEBUG){
						console.log('fetch');
						console.log(doc);
					}
					if(err) cb(err, null);
					else if(!doc) cb(err, null);
					else cb(err, doc.data);
				});
			}

			saveUserData = function(userId, userObj, cb) {
				var collection = db.collection('users');
				var newObj = {};
				newObj.userId = userId;
				newObj.data = userObj;
				if(DEBUG){
					console.log('store');
					console.log(newObj);
				}
				collection.update({userId: userId}, newObj, {upsert: true, multi: false}, function(err, result) {
					cb(err, result);
				});
			}
			
			accessUserData = function(cb){
				cb(db.collection('users'));
			}
			
			accessDatabase = function(collectionName, cb){
				cb(db.collection(collectionName));
			}
			
			module.exports.storage.getUserData = getUserData;
			module.exports.storage.saveUserData = saveUserData;
			module.exports.storage.accessUserData = accessUserData;
			module.exports.storage.accessDatabase = accessDatabase;
		});
	} else {
		getUserData = function(userId, cb) {
			console.log(userId);
			cb(map[userId]);
		}

		saveUserData = function(userId, userObj, cb) {
			map[userId] = userObj;
			cb(true);
		}
		
		accessUserData = function(cb){
			throw 'accessUserData not implemented for non-persistent storage';
		}
		
		accessDatabase = function(collectionName, cb){
			throw 'accessDatabase not implemented for non-persistent storage';
		}
		
		module.exports.storage.getUserData = getUserData;
		module.exports.storage.saveUserData = saveUserData;
		module.exports.storage.accessUserData = accessUserData;
		module.exports.storage.accessDatabase = accessDatabase;
	}
}

var setup = function(){
	if (DEBUG) app.use(connect.logger('dev'));
	app.use(connect.cookieParser());
	app.use(connect.session({
		secret: SECRET_KEY,
		store: connect.session.MemoryStore({
			reapInterval: 60000 * 10
		})
	}));
	app.use(connect.json());
	app.use(connect.urlencoded());
	configure(app);

	/*----------------------------AUTH ROUTES------------------------------*/

	register(app);

	/*-------------------------------Routes---------------------------------*/
	if (DEBUG) {
		app.get('/test', function(req, res) {
			res.send(200, "test successful");
		});
	}
}

var configure = function(){};
module.exports.configure = function(_configure) {
	configure = _configure;
};

var register = configure;
module.exports.register = function(_register) {
	register = _register;
};

var onUserCreated = configure;
module.exports.onUserCreated = function(_ouc) {
	onUserCreated = _ouc;
};

var listen = function(){
	setup();	
	if(IS_SECURE) {
		var options = {
			key: fs.readFileSync(SSL_KEY_PATH),
			cert: fs.readFileSync(SSL_CERTIFICATE_PATH)
		};
		https.createServer(options, app).listen((HTTPS_PORT) ? HTTPS_PORT : 443);
		if (DEBUG) console.log('https server listening on port ' + ((HTTPS_PORT) ? HTTPS_PORT : 443));
	}
	http.createServer(app).listen((HTTP_PORT) ? HTTP_PORT : 80);
	if (DEBUG) console.log('http server listening on port ' + ((HTTP_PORT) ? HTTP_PORT : 80));
}

module.exports.init = init;
module.exports.listen = listen;
module.exports.express = express;
module.exports.storage = {};