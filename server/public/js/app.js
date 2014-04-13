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

toastr.options = {
  "closeButton": false,
  "debug": false,
  "positionClass": "toast-bottom-right",
  "onclick": null,
  "showDuration": "200",
  "hideDuration": "1000",
  "timeOut": "5000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut"
};