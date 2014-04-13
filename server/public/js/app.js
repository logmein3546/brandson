/****************************** APP DECLARATION ******************************/

var app = angular.module('BitBeamApp', ['ngRoute' /* Module dependencies */ ]);

/****************************** ROUTING DECLARATIONS *************************/

app.config(function($routeProvider, $locationProvider) {
	$routeProvider.when("/:machineName/:path*", {
		templateUrl: "/static/templates/browser.html", 
		controller: "BrowserCtrl"
	}).when("/:machineName", {
		templateUrl: "/static/templates/browser.html", 
		controller: "BrowserCtrl"
	}).when("/", {
		templateUrl: "/static/templates/oops.html"
	}).otherwise({
		redirectTo: "/"
	});
	
	$locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
});