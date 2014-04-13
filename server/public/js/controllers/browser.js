app.controller("BrowserCtrl", function($scope, $window, LogSvc, BrowserSvc) {
	/********* UI HELPERS *********/
	// This code handles the drag resizing of the left navigation
	const MIN_LEFT_NAVIGATION_WIDTH = 250;
	$(function() {
		var i = 0;
		var dragging = false;
		// DOM elements
		var leftPane = $('#leftPane');
		var rightPane = $('#rightPane');
		$('#dragbar').mousedown(function(e) {
			e.preventDefault();		   
			dragging = true;
			$(document).mousemove(function(e) {
				if (e.pageX >= MIN_LEFT_NAVIGATION_WIDTH) {
					leftPane.css('width', (e.pageX));
					rightPane.css('left', (e.pageX));
				}
			});
			// Handles UI render delay weirdness
			leftPane.css('cursor', 'col-resize');
			rightPane.css('cursor', 'col-resize');
		});
		$(document).mouseup(function(e) {
			if (dragging) {
				$(document).unbind('mousemove');
				dragging = false;
				// Revert the UI render delay crutch
				leftPane.css('cursor', 'auto');
				rightPane.css('cursor', 'auto');
			}
		});
	});
});
// Controller for the sidebar of the browser
app.controller("BrowserSidebarCtrl", function($rootScope, $scope, $routeParams, LogSvc, BrowserSvc) {
	/**** Controller constants ****/
	var GET_CHILDEREN_LOADING_APPEAR_DELAY = 50; // How long to wait before we show loading gif in ms
	var GET_CHILDEREN_LOADING_DISAPPEAR_DELAY = 150; // How long to wait before we hide loading gif in ms
	var EXPAND_SCROLL_PADDING = 5; // Makes the auto scroll a bit nicer
	
	var SIDEBAR_STATE_LOADING	= 0; // Means that the sidebar is loading
	var SIDEBAR_STATE_EMPTY		= 1; // Means that there are no machines defined
	var SIDEBAR_STATE_NORMAL	= 2; // Means that the accordion is visible
	var SIDEBAR_STATE_ERROR	 	= 3; // Means that there was an issue loading
	
	var MACHINE_STATE_LOADING	= 0; // Means that the machine is loading
	var MACHINE_STATE_EMPTY		= 1; // Means that there are no nodes in the machine
	var MACHINE_STATE_NORMAL	= 2; // Means that the folders are visible
	var MACHINE_STATE_ERROR	 	= 3; // Means that there was an issue loading
	
	/**** Exposed model-friendly methods ****/
	
	$scope.navJump = function(node) {
		if (node) {
			$rootScope.$broadcast('file', { path: (node.path || node.name)});
		}
	};
	
	// Expands a node with its children
	$scope.expand = function(node, $event) {
		// Only consider expandable nodes
		if (node.expandable) {
			// Check to see if we already loaded the sub nodes of this node already
			if (node.nodes) {
				node.expanded = true;
			} else {
				var arrow = $event ? $($event.target) : null;
				// We need to load the sub nodes of this node
				// Add the loading class to the click target after a delay
				var loadingDelayTimer = window.setTimeout(function() {
					if (arrow) arrow.addClass('loading');
				}, GET_CHILDEREN_LOADING_APPEAR_DELAY);
				node.nodes = [];
				// Handle machines and directories slightly differently
				var level = (node.isMachine) ? 1 : ((node.level || 0) + 1);
				var path = node.path || node.name;
				// Execute the ls
				LogSvc.d('Loading sub-nodes on ' + $routeParams.machineName);
				BrowserSvc.ls($routeParams.machineName, path).success(function(data) {
					LogSvc.d('Sub-nodes loaded successfully');
					var dirCount = 0; // Keeps track of how many directories were loaded
					if (data.length !== 0) {
						// Process the data we get from the server
						for (var i = 0; i < data.length; i++){
							node.nodes.push({
								dirName: data[i].name, 
								machineName: $routeParams.machineName, 
								path: path +'/' + data[i].name, 
								expandable: data[i].isDir, 
								expanded: false,
								isDir: data[i].isDir,
								level: level
							});
							dirCount++;
						}
					}
					// If there was a problem report it 
					if (dirCount < 1) {
						// If we found 0 dirs, clearly the node is not expandable
						node.expandable = false;
						LogSvc.d('Node had no sub-nodes - marking it unexpandable');
						// If this is a machine - update its status
						if (node.isMachine) {
							node.status = MACHINE_STATE_EMPTY;
							console.log(node);
						}
					} else {
						node.expanded = true;
						// If this is a machine - update its status
						if (node.isMachine) node.status = MACHINE_STATE_NORMAL;
					}
					// Kill the loading delay since we're done already
					window.clearTimeout(loadingDelayTimer);
					// Clear away loading class from click target after a brief delay
					window.setTimeout(function() {
						$scope.$apply(function() {
							if (arrow) arrow.removeClass('loading');
						});
					}, GET_CHILDEREN_LOADING_DISAPPEAR_DELAY);
				}).error(function(err){
					LogSvc.e('Loading sub-nodes failed', err);
					// Kill the loading delay since we're done already
					window.clearTimeout(loadingDelayTimer);
					// Clear away loading class from click target immediately
					if (arrow) arrow.removeClass('loading');
					// If this is a machine - update its status
					if (node.isMachine) node.status = MACHINE_STATE_ERROR;
				});
			}
		}
	};
	// Opposite of expand - simply hides children
	$scope.contract = function(node) {
		// Only consider expandable nodes
		if (node.expandable) {
			node.expanded = false;
		}
	};
	
	/**** Exposed model-friendly properties ****/
	// The set of directories
	$scope.nodes = [];
	// State keeps track of what, in general, we should be showing the user
	$scope.state = SIDEBAR_STATE_LOADING;
	// Current path
	$rootScope.currentPath = $routeParams.path ? '/' + $routeParams.path : '/';
	
	/**** Code intended to run when this controller is loaded ****/
	// Load all the machines as soon as this view is shown
	BrowserSvc.ls($routeParams.machineName, '/').success(function(nodes) {
		for (var i = 0; i < nodes.length; i++) {
			nodes[i].expandable = nodes[i].isDir;
			nodes[i].path = '/' + nodes[i].name;
		}
		
		$scope.nodes = nodes;
		$scope.state = nodes.length ? SIDEBAR_STATE_NORMAL : SIDEBAR_STATE_EMPTY;
	}).error(function(err) {
		$scope.state = SIDEBAR_STATE_ERROR;
		LogSvc.e('Couldn\'t load the directories');
		console.log(err);
	});
	
	$scope.reloadNav = function() {
		$scope.state = SIDEBAR_STATE_LOADING;
		BrowserSvc.ls($routeParams.machineName, '/').success(function(nodes) {
			for (var i = 0; i < nodes.length; i++) {
				nodes[i].expandable = nodes[i].isDir;
				nodes[i].path = '/' + nodes[i].name;
			}
			
			$scope.nodes = nodes;
			$scope.state = nodes.length ? SIDEBAR_STATE_NORMAL : SIDEBAR_STATE_EMPTY;
		}).error(function(err) {
			$scope.state = SIDEBAR_STATE_ERROR;
			LogSvc.e('Couldn\'t load the directories');
			console.log(err);
		});
	};
});
// Controller for the editor
app.controller("EditorCtrl", function($routeParams, $scope, $rootScope) {
});
// Controller for the editor
app.controller("BrowserContentCtrl", function($routeParams, $scope, $rootScope, BrowserSvc) {
	var STATE_LOADING	= 0; // Means that the sidebar is loading
	var STATE_DIR		= 1; // Means that there are no machines defined
	var STATE_NORMAL	= 2; // Means tha	t the accordion is visible
	var STATE_ERROR	 	= 3; // Means that there was an issue loading
	
	var isFile = function (name) {
		return !!(name.match(/[^,/]*\.[^,/]+$/g));
	};
	
	var map = {'.js': 'javascript', 
	'.json': 'javascript', 
	'.md': 'markdown', 
	'.c': 'clike', 
	'.cc': '.clike', 
	'.css': 'css', 
	'.cs': 'clike', 
	'.cpp': 'clike', 
	'html': 'htmlmixed'};
	var modeOf = function(name) {
		var results = /\.[0-9a-z]+$/i.exec(name);
		if (results) {
			if (map[results[0]]) return map[results[0]];
			else return '';
		}
		return '';
	}
	
	$scope.linkMe = function() {
		window.prompt("Copy the file link to clipboard (Ctrl+C, Enter):", "http://thecodebutler.com/" + $routeParams.machineName + "/" + $scope.suchPath);
	};
	
	$scope.state = STATE_LOADING;
	$scope.suchPath = "";
	// Do the initial load
	if (isFile($routeParams.path || '/')) {
		$scope.state = STATE_LOADING;
		$scope.suchPath = $routeParams.path;
		setTimeout(function() {
		BrowserSvc.file($routeParams.machineName, $routeParams.path).success(function(contents) {
			setTimeout(function() {
				if (typeof contents !== 'string') {
					contents = JSON.stringify(contents);
					console.log('caught um');
				}
				doEditor(args.path, contents);
			}, 500);
			$scope.state = STATE_NORMAL;
		}).error(function(err) {
			console.log('WAT', err);
			$scope.state = STATE_DIR;
		});
		}, 250);
	} else {
		$scope.state = STATE_DIR;
	}
	
	$rootScope.$on('file', function(evt, args) {
		$scope.state = STATE_LOADING;
		$scope.suchPath = args.path;
		BrowserSvc.file($routeParams.machineName, args.path).success(function(contents) {
			setTimeout(function() {
				if (typeof contents !== 'string') {
					contents = JSON.stringify(contents);
					console.log('caught um');
				}
				doEditor(args.path, contents);
			}, 150);
			$scope.state = STATE_NORMAL;
		}).error(function(err) {
			console.log('WAT', err);
			$scope.state = STATE_DIR;
		});
	});
	
	$scope.save = function() {
		if ($scope.suchPath && existingEditor && existingEditor.getText) {
			BrowserSvc.save($routeParams.machineName, $scope.suchPath, existingEditor.getText()).success(function() {
				toastr.success("Your changes are most excellent.", "Save Successful");
			}).error(function(err) {
				toastr.success("There appears to be an issue with your connection..", "Save Unsuccessful");
			});
		}
	};
	
	$(document).keydown(function(event) {
		var currKey=0,e=e||event; 
		currKey=e.keyCode||e.which||e.charCode;  //do this handle FF and IE
		if (!( String.fromCharCode(event.which).toLowerCase() == 's' && event.ctrlKey) && !(event.which == 19)) return true;
		event.preventDefault();
		$scope.save();
		return false;
	});
	
	var leftNavVisible = true;
	$scope.leftNav = function() {
		if (leftNavVisible) {
			$('#dragbar').hide();
			$('#leftPane').css('width', 0);
			$('#rightPane').css('left', 0);
			leftNavVisible = !leftNavVisible;
		} else {
			$('#dragbar').show();
			$('#leftPane').css('width', 300); 
			$('#rightPane').css('left', 300);
			leftNavVisible = !leftNavVisible;
		}
	};
	
	var rightNavVisible = true;
	$scope.rightNav = function() {
		if (rightNavVisible) {
			$('#editor').css('right', 0);
			$('#userlist').css('width', 0);
			rightNavVisible = !rightNavVisible;
		} else {
			$('#editor').css('right', 200); 
			$('#userlist').css('width', 200);
			rightNavVisible = !rightNavVisible;
		}
	};
	
	var escape = function(str) {
		return str.replace(/[\.#\[\]\$]/g, '');
	};
	
	var existingEditor;
	var doEditor = function(path, content) {
		if (existingEditor && existingEditor.dispose) existingEditor.dispose();
		//// Initialize Firebase
		var firepadRef = new Firebase('https://bransonapp.firebaseio.com/');
		var childRef = firepadRef.child(escape($routeParams.machineName + '-' + path));
		
		//// Create CodeMirror (with lineWrapping on).
		var codeMirror = CodeMirror(document.getElementById('editor'), { lineWrapping: true, lineNumbers: true, mode: modeOf(path) });
		
		// Create a random ID to use as our user ID (we must give this to firepad and FirepadUserList).
		var userId = Math.floor(Math.random() * 9999999999).toString();
	
		//// Create Firepad (with rich text toolbar and shortcuts enabled).
		var firepad = Firepad.fromCodeMirror(childRef, codeMirror, { userId: userId });
		existingEditor = firepad;
		
		//// Create FirepadUserList (with our desired userId).
		var firepadUserList = FirepadUserList.fromDiv(firepadRef.child('users'), document.getElementById('userlist'), userId);

		//// Initialize contents.
		firepad.on('ready', function() {
			if (firepad.isHistoryEmpty()) {
				firepad.setText(content);
			}
		});
	}
	
	$rootScope.$on('FILE', function(args) {
		doEditor(args.path);
	});
});
