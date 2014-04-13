app.service('BrowserSvc', function($http) {
	this.ls = function (machineName, path) {
		return $http({
			url: '/ls',
			method: "GET", 
			withCredentials: true,
			params: {machineName: machineName, path: path}
		});
	};
	
	this.file = function (machineName, path) {
		return $http({
			url: '/file',
			method: "GET", 
			withCredentials: true,
			params: {machineName: machineName, path: path}
		});
	};
	
	this.save = function (machineName, path, text) {
		return $http({
			url: '/save',
			method: "POST", 
			withCredentials: true,
			data: {machineName: machineName, path: path, text: text}
		});
	};
});