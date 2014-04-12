app.service('BrowserSvc', function($http) {
	this.getMachine = function (name) {
		return $http({
			url: '/machine',
			method: "GET",
			withCredentials: true,
			params: {machineName: name}
		});
	};
	
	this.getMachines = function () {
		return $http({
			url: '/machines',
			method: "GET",
			withCredentials: true
		});
	};

	this.ls = function (machineName, path) {
		return $http({
			url: '/ls',
			method: "GET", 
			withCredentials: true,
			params: {machineName: machineName, path: path}
		});
	};
});

app.service('InstallerSvc', function($http) {
	this.claim = function (key, name) {
		return $http({
			url: '/installer/claim',
			method: "POST",
			withCredentials: true,
			params: {key: key, machineName: name}
		});
	};
});