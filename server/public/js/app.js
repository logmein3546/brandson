/****************************** APP DECLARATION ******************************/

var app = angular.module('BitBeamApp', ['ngRoute' /* Module dependencies */ ]);

/****************************** ROUTING DECLARATIONS *************************/

app.config(function($routeProvider) {
	$routeProvider.when("/browser", {
		templateUrl: "static/templates/browser.html", 
		controller: "BrowserCtrl"
	}).otherwise({
		redirectTo: "/browser"
	});
});