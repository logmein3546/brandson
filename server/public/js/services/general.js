// Handles logging in general - all logging goes through this service
app.service('LogSvc', function() {
	// Logs at the info level
	this.i = function(msg) {
		console.log('[bitbeam][info]\t\t', msg);
	};
	// Logs at the debug level
	this.d = function(msg) {
		console.log('[bitbeam][debug]\t', msg);
	};
	// Logs at the error level
	this.e = function(msg, err) {
		console.log('[bitbeam][error]\t', msg, err);
	};
});