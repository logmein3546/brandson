// Main Controller for the browser page as a whole
app.controller("BrowserCtrl", function($scope, $window, LogSvc, BrowserSvc) {
	/********* UI HELPERS *********/
	// This code handles the drag resizing of the left navigation
	const MIN_LEFT_NAVIGATION_WIDTH = 300;
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
					leftPane.css('width', (e.pageX - 50));
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
app.controller("BrowserSidebarCtrl", function($rootScope, $scope, LogSvc, BrowserSvc) {
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
	
	/**** Internal controller helpers ****/
	// Adds a machine from the backend to the local list of machines
	var pushMachine = function(backendMachine, added) {
		$scope.machines.unshift({
			dirName: backendMachine.machineName || backendMachine.name, 
			isMachine: true, 
			machineType: 'windows', /* TODO: we need to put what OS/type of device it is */
			expandable: true, 
			level: 0,
			added: added,
			status: MACHINE_STATE_LOADING
		});
	};
	
	/**** Event handling goes here ****/
	// Handle a machine being added at runtime
	$rootScope.$on('NEW_MACHINE', function(event, data) {
		LogSvc.d('NEW_MACHINE event received by the browser side bar controller');
		if (data && data.machine) {
			// Add the new machine
			LogSvc.d('Pushing new machine into the left navigation...');
			pushMachine(data.machine, true);
			// $scope.resizeAccordion();
		} else {
			LogSvc.e('The new machine received in NEW_MACHINE was undefined');
		}
	});
	
	/**** Exposed model-friendly methods ****/
	// Loads all the machines for a user
	$scope.loadMachines = function(optionalCallback) {
		LogSvc.i('Loading machines');
		// Create the machines array if it doesn't already exist
		if (!$scope.machines) $scope.machines = [];
		BrowserSvc.getMachines().success(function(data) {
			LogSvc.i('Machines loaded successfully');
			LogSvc.d('Machines loaded are as follows: ' + JSON.stringify(data));
			// Clear the machines from the list
			$scope.machines.length = 0;
			LogSvc.d('Pushing the machines into the tree');
			// DELETE ME TEST CODE
			pushMachine({machineName: 'Arthurian'});
			pushMachine({machineName: 'Dracarus'});
			// Pushes each of the user's machines into the left navigation
			data.forEach(function(machine) {
				pushMachine(machine);
			});
			// Fire the callback is its defined
			if (optionalCallback) optionalCallback(null, $scope.machines);
		}).error(function(err) {
			LogSvc.e('Machine loading failed', err);
			// Fire the callback is its defined
			if (optionalCallback) optionalCallback(err);
		});
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
				var machineName = (node.isMachine) ? node.dirName : node.machineName;
				var path = (node.isMachine) ? '/' : node.path;
				var level = (node.isMachine) ? 1 : ((node.level || 0) + 1);
				// Execute the ls
				LogSvc.d('Loading sub-nodes on ' + machineName);
				BrowserSvc.ls(machineName, path).success(function(data) {
					LogSvc.d('Sub-nodes loaded successfully');
					var dirCount = 0; // Keeps track of how many directories were loaded
					if (data.length !== 0) {
						// Process the data we get from the server
						for (var i = 0; i < data.length; i++){
							if(!data[i].isDir) continue;
							node.nodes.push({
								dirName: data[i].name, 
								machineName: machineName, 
								path: path + data[i].name + '/', 
								expandable: true, 
								expanded: false,
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
	// Shows the installer modal
	$scope.installerModal = function() {
		LogSvc.d('Showing installer modal');
		$('#installer-modal').modal('show');
	};
	
	/**** Exposed model-friendly properties ****/
	// The set of machines for the current user
	$scope.machines = [];
	// State keeps track of what, in general, we should be showing the user
	$scope.state = SIDEBAR_STATE_LOADING;
	
	/**** Code intended to run when this controller is loaded ****/
	// Load all the machines as soon as this view is shown
	$scope.loadMachines(function(err, machines) {
		// Run ls on the first machine
		if (!err && machines && machines.length > 0) {
			machines.forEach(function(machine) {
				$scope.expand(machine);
			});
			// Machines loaded normally
			$scope.state = SIDEBAR_STATE_NORMAL;
		} else if (!machines || !machines.length) {
			// We have no machines defined yet
			$scope.state = SIDEBAR_STATE_EMPTY;
		} else {
			// There was an error
			$scope.state = SIDEBAR_STATE_ERROR;
		}
	});
	
	/**** UI HELPERS ****/
	$scope.accordionPromptMargin = 0;
	// Re-calculates the accordion height
	$scope.resizeAccordion = function() {
		// How tall is the accordion
		var height = $('#sidebar #machine-accordion').height();
		// How tall are the headings combined?
		var headingHeight = 0;
		$('#sidebar #machine-accordion .panel-heading').each(function() {
			headingHeight += $(this).outerHeight(true);
		}).promise().done(function() {
			// We have everything we need
			var bodyHeight = height - headingHeight;
			$('#sidebar #machine-accordion .panel-body').outerHeight(bodyHeight);
			$scope.accordionPromptMargin = Math.abs(((bodyHeight - /* Padding */ 20) - /* Height of message */ 124) / 2);
		});
	};
	// Register the event listener for window resizing
	$(function() {
		// Run the calculation when the window is resized
		$(window).resize(function() {
			$scope.resizeAccordion();
		});
	});
	// This code manages the accordion
	var collapsedIndex = 0; // The first section always starts closed
	$scope.doCollapse = function(index, machine) {
		if ($scope.machines.length > 1) {
			if (collapsedIndex !== index) {
				$('#sidebar #machine-accordion .collapse.in').collapse('hide');
				$('#sidebar #machine-accordion #accordion-' + index).collapse('show');
				collapsedIndex = index;
				// Get the machine's details
				if (machine) $scope.expand(machine);
			}
		} else {
			LogSvc.d('Accordion behavior is disabled with only 1 machine');
		}
	};
});
// Controller for the installer modal (popup that installs the client)
app.controller("InstallerModalCtrl", function($rootScope, $scope, $http, $window, LogSvc, BrowserSvc, InstallerSvc) {
	const STEP_COUNT = 6;

	// The chosen computer name
	var computerName = null;
	// The installer key
	var installerKey = null;
	// All the possible prompts for the next button 
	var nextPrompts = ['I\'m Down With That', 'The Installer is Open', 'I\'m Ready', 'Are We Done Yet?', 'Finish Up'];
	// Just does basic string checks on the installer key
	var verifyInstallerKey = function(installerKey, callback) {
		if (!installerKey || installerKey === '' || installerKey.trim() === '' || installerKey.trim().length !== 20) {
			callback('The installer key was the wrong length.');
		} else {
			callback();
		}
	};
	// Returns null if the installer key is legit or the error message otherwise
	var claimInstallerKey = function(installerKey, machineName, callback) {
		// Check that it isn't an existing machine
		if (!machineName || machineName === '' || machineName.trim() === '') {
			callback('The name you gave was empty. Don\'t be that guy.');
			return;
		} else {
			// First we check the name
			BrowserSvc.getMachines().success(function(data) {
				if (!data) {
					callback('There was a network problem. Please check your connection and try again.');
				} else {
					for (var i = 0; i < data.length; i++) {
						if (data[i].machineName && (data[i].machineName.toLowerCase() === machineName.toLowerCase())) {
							callback('The name you gave is already in use silly.');
							return;
						}
					}
					// Ok, machine name is legit - do the claim
					InstallerSvc.claim(installerKey, computerName).success(function(data) {
						if (!data) {
							callback('There was a network problem. Please check your connection and try again.');
						} else {
							callback();
						}
					}).error(function(err) {
						callback('Some guy already used that key. >:-(.');
					});
				}
			}).error(function(err) {
				callback('There was a network problem. Please check your connection and try again.');
			});
		}
	};
	// Reset the state of the modal
	var resetModal = function() {
		setTimeout(function() {
			LogSvc.d('Resetting the installer modal');
			computerName = null;
			// Update model variables
			$scope.step = 0;
			$scope.nextPrompt = nextPrompts[0];
		}, 350);
	};
	// Moves the step along
	var advance = function() {
		$scope.step = (($scope.step + 1) % STEP_COUNT);
		if ($scope.step < nextPrompts.length)
			$scope.nextPrompt = nextPrompts[$scope.step];
	};
	
	/**** Exposed model-friendly methods ****/
	// Moves to the next step in the modal
	$scope.next = function() {
		LogSvc.d('Moving to the next step in the installer dialog');
		if (!$scope.step) {
			// Next on the first page downloads the installer before continuing
			$window.location.href = '/installer/download';
			// Move on to next page
			advance();
		} else if ($scope.step === (STEP_COUNT - 3)) {
			// If we're on the second page - we need to make sure that installer key is correct before continuing
			installerKey = $('#installer-modal #installer-key').val();
			// Check that installer key is legit
			$scope.isLoading = true;
			verifyInstallerKey(installerKey, function(err) {
				$scope.isLoading = false;
				if (err) {
					// Show the error on the screen
					$('#installer-modal #installer-key-alert').text(err).show();
					$('#installer-modal #installer-key').focus();
					LogSvc.d('Invalid installer key specified');
				} else {
					$('#installer-modal #installer-key-alert').hide();
					LogSvc.d('Installer key was given - moving on');
					// Move on to next page
					advance();
				}
			});
		} else if ($scope.step === (STEP_COUNT - 2)) {
			// If we're on the second page - we need to make sure that computer name is correct before continuing
			computerName = $('#installer-modal #computer-name').val();
			// Check that computer name is legit
			$scope.isLoading = true;
			claimInstallerKey(installerKey, computerName, function(err) {
				$scope.isLoading = false;
				if (err) {
					// Show the error on the screen
					$('#installer-modal #computer-name-alert').text(err).show();
					$('#installer-modal #computer-name').focus();
					LogSvc.d('Invalid computer name specified');
				} else {
					$('#installer-modal #computer-name-alert').hide();
					LogSvc.d('Computer name was given - moving on');
					advance();
					// Get the machine name and shout that we have a new machine
					BrowserSvc.getMachine(computerName).success(function(data) {
						// Propagate that we have a new machine
						LogSvc.d('Adding computer with name \'' + computerName + '\'');
						$rootScope.$broadcast('NEW_MACHINE', {
							machine: data
						});
						// After a brief delay, finish up
						setTimeout(function() {
							// Hide this modal
							$('#installer-modal').modal('hide');
							// Resetting the modal
							resetModal();
						}, 500);
					}).error(function(err) {
						// TODO do something useful here
						alert('There was a network problem. Please check your connection and try again.');
						// Backtrack to previous page
						$scope.step = (($scope.step - 1) % STEP_COUNT);
					});
				}
			});
		} else {
			advance();
		}
	};
	// Fired when the modal is hidden by user UI event
	$scope.escape = function() {
		resetModal();
	};
	
	/**** Exposed model-friendly properties ****/
	$scope.step = 0;
	$scope.nextPrompt = nextPrompts[0];
});
// Highest level controller for the file browser
app.controller("FileViewerCtrl", function($rootScope, $scope, BrowserSvc) {
	/**** Exposed model-friendly properties ****/
	$scope.currentMachine = '';
	$rootScope.currentPath = []; // Current path 
	$scope.displayDetailMode = true; // True if in detail mode
	$scope.sortColumn = ''; // The current sort column
	$scope.isDescending = false; // True if the sort is descending
	
	/**** Exposed model-friendly methods ****/
	$scope.changeSorting = function(column) {
		console.log(column);
		if ($scope.sortColumn == column) {
			$scope.isDescending = !$scope.isDescending;
		} else {
			$scope.sortColumn = column;
			$scope.isDescending = false;
		}
	};
	
	$scope.currentPathString = function(){
		var result = '/'; 
		for(var i=0; i<$scope.currentPath.length; i++){
			result += $scope.currentPath[i] + '/';
		}
		return result;
	}
	
	$scope.getMachines = function(cb){
		$scope.loading = true;
		BrowserSvc.getMachines().success(function(data){
			$scope.loading = false;
			$scope.machines = data;
			if(cb) cb(data);
		}).error(function(err){
			console.log(err);
			$scope.loading = false;
		});
	}
	
	$scope.ls = function(cb, errCb){
		$scope.loading = true;
		BrowserSvc.ls($scope.currentMachine, $scope.currentPathString()).success(function(data){
			$scope.loading = false;
			if(!data.error) $scope.files = data;
			if(cb) cb(data);
		}).error(function(err){
			console.log(err);
			$scope.loading = false;
		});
	}
	
	$scope.navIn = function(newDir){
		if($scope.currentMachine === '') $scope.currentMachine = newDir;
		else $scope.currentPath.push(newDir);
		$scope.ls(function(data){
			if(data.error){
				if($scope.currentPath.length > 0) $scope.currentPath.pop();
				else $scope.currentMachine = '';
			}
		});
	}
	
	$scope.navOut = function(){
		if($scope.currentPath.length > 0) $scope.currentPath.shift();
		else $scope.currentMachine = '';
		$scope.ls();
	}
	
	$scope.navBreadcrumb = function(newDirLevel){
		if(newDirLevel === -1){
			$scope.currentMachine = '';
			$scope.currentPath = [];
		}else{
			for(var i=0; i<$scope.currentPath.length - newDirLevel + 1; i++){
				$scope.currentPath.pop();
			}
		}
		$scope.ls();
	}
	
	$scope.navJump = function(node){
		if(node.isMachine){
			$scope.currentPath = [];
			$scope.currentMachine = node.dirName;
		}else{
			$scope.currentMachine = node.machineName;
			$scope.currentPath = node.path.split('/');
			$scope.currentPath.pop();
		}
		$scope.ls();
	}
	
	$scope.downloadFile = function(filename){
		$window.location.href = '/file?machineName=' + $scope.currentMachine + '&path=' + $scope.currentPathString() + filename;
	}
	
	$scope.toggleExpansion = function(node, $event){
		if(node.expandable){
			$scope.getChildren(node, $event);
			node.expanded = !node.expanded;
		}
	}
	
	$scope.getDateString = function(timeString){
		return new Date(timeString).toLocaleDateString();
	}
	
	$scope.getTimeString = function(timeString){
		return new Date(timeString).toLocaleTimeString();
	}
	
	$scope.toggleDetailedMode = function(){
		$scope.displayDetailMode = !$scope.displayDetailMode;
	}
	
	$scope.getMachines(function(data){
		$scope.sidebarTree = [];
		for (var i = 0; i < data.length; i++) {
		// TODO make machineTYpe variable - right now its always 'windows'
			$scope.sidebarTree.push({dirName: data[i].machineName, isMachine: true, machineType: 'windows', expandable: true, level: 0});
		}
	});
});
// Controller 
app.controller("BreadcrumbCtrl", function($rootScope, $scope) {
});