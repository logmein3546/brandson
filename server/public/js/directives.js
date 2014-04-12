// Fires a supplied expression when the enter key is pressed
app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});
// Focuses when an element is loaded into the DOM
app.directive('ngFocusOnLoad', function () {
    return function (scope, element, attrs) {
        element.focus();
    };
});
// Evaluates expression on render
app.directive('ngOnRender', function () {
    return function (scope, element, attrs) {
		scope.$eval(attrs.ngOnRender);
    };
});