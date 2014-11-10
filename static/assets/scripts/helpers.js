(function() {
  var createDocumentHelpers, createFormHelpers, formInput, formValidate, tabReveal, tabbable,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty;

  angular.module('h.helpers', ['bootstrap']);

  tabbable = [
    '$timeout', function($timeout) {
      return {
        link: function(scope, elem, attrs, ctrl) {
          var render;
          if (!ctrl) {
            return;
          }
          render = ctrl.$render;
          return ctrl.$render = function() {
            render.call(ctrl);
            return $timeout(function() {
              return elem.find(':input').filter(':visible:first').focus();
            }, false);
          };
        },
        require: '?ngModel',
        restrict: 'C'
      };
    }
  ];

  tabReveal = [
    '$parse', function($parse) {
      return {
        compile: function(tElement, tAttrs, transclude) {
          var hiddenPanesGet, panes;
          panes = [];
          hiddenPanesGet = $parse(tAttrs.tabReveal);
          return {
            pre: function(scope, iElement, iAttrs, _arg) {
              var addPane, ngModel, tabbable, _ref;
              _ref = _arg != null ? _arg : controller, ngModel = _ref[0], tabbable = _ref[1];
              addPane = tabbable.addPane;
              return tabbable.addPane = (function(_this) {
                return function(element, attr) {
                  var removePane;
                  removePane = addPane.call(tabbable, element, attr);
                  panes.push({
                    element: element,
                    attr: attr
                  });
                  return function() {
                    var i, pane;
                    for (i in panes) {
                      pane = panes[i];
                      if (pane.element === element) {
                        panes.splice(i, 1);
                        break;
                      }
                    }
                    return removePane();
                  };
                };
              })(this);
            },
            post: function(scope, iElement, iAttrs, _arg) {
              var ngModel, render, tabbable, tabs, _ref;
              _ref = _arg != null ? _arg : controller, ngModel = _ref[0], tabbable = _ref[1];
              tabs = angular.element(iElement.children()[0].childNodes);
              render = angular.bind(ngModel, ngModel.$render);
              return ngModel.$render = function() {
                var hiddenPanes, i, pane, value, _results;
                render();
                hiddenPanes = hiddenPanesGet(scope);
                if (!angular.isArray(hiddenPanes)) {
                  return;
                }
                _results = [];
                for (i in panes) {
                  pane = panes[i];
                  value = pane.attr.value || pane.attr.title;
                  if (value === ngModel.$viewValue) {
                    pane.element.css('display', '');
                    _results.push(angular.element(tabs[i]).css('display', ''));
                  } else if (__indexOf.call(hiddenPanes, value) >= 0) {
                    pane.element.css('display', 'none');
                    _results.push(angular.element(tabs[i]).css('display', 'none'));
                  } else {
                    _results.push(void 0);
                  }
                }
                return _results;
              };
            }
          };
        },
        require: ['ngModel', 'tabbable']
      };
    }
  ];

  angular.module('h.helpers').directive('tabbable', tabbable).directive('tabReveal', tabReveal);

  createFormHelpers = function() {
    return {
      applyValidationErrors: function(form, errors, reason) {
        var error, field;
        for (field in errors) {
          if (!__hasProp.call(errors, field)) continue;
          error = errors[field];
          form[field].$setValidity('response', false);
          form[field].responseErrorMessage = error;
        }
        form.$setValidity('response', !reason);
        return form.responseErrorMessage = reason;
      }
    };
  };

  formInput = function() {
    return {
      link: function(scope, elem, attr, _arg) {
        var errorClassName, fieldClassName, form, model, render, resetResponse, toggleClass, validator;
        form = _arg[0], model = _arg[1], validator = _arg[2];
        if (!((form != null ? form.$name : void 0) && (model != null ? model.$name : void 0) && validator)) {
          return;
        }
        fieldClassName = 'form-field';
        errorClassName = 'form-field-error';
        render = model.$render;
        resetResponse = function(value) {
          model.$setValidity('response', true);
          return value;
        };
        toggleClass = function(addClass) {
          elem.toggleClass(errorClassName, addClass);
          return elem.parent().toggleClass(errorClassName, addClass);
        };
        model.$parsers.unshift(resetResponse);
        model.$render = function() {
          toggleClass(model.$invalid && model.$dirty);
          return render();
        };
        validator.addControl(model);
        scope.$on('$destroy', function() {
          return validator.removeControl(this);
        });
        return scope.$watch(function() {
          if ((model.$modelValue != null) || model.$pristine) {
            toggleClass(model.$invalid && model.$dirty);
          }
        });
      },
      require: ['^?form', '?ngModel', '^?formValidate'],
      restrict: 'C'
    };
  };

  formValidate = function() {
    return {
      controller: function() {
        var controls;
        controls = {};
        return {
          addControl: function(control) {
            if (control.$name) {
              return controls[control.$name] = control;
            }
          },
          removeControl: function(control) {
            if (control.$name) {
              return delete controls[control.$name];
            }
          },
          submit: function() {
            var control, _, _results;
            _results = [];
            for (_ in controls) {
              control = controls[_];
              control.$setViewValue(control.$viewValue);
              _results.push(control.$render());
            }
            return _results;
          }
        };
      },
      link: function(scope, elem, attr, ctrl) {
        return elem.on('submit', function() {
          return ctrl.submit();
        });
      }
    };
  };

  angular.module('h.helpers').directive('formInput', formInput).directive('formValidate', formValidate).factory('formHelpers', createFormHelpers);

  createDocumentHelpers = [
    '$document', function($document) {
      return {
        baseURI: (function() {
          var baseURI;
          baseURI = $document.prop('baseURI');
          if (!baseURI) {
            baseURI = $document.find('base').prop('href') || $document.prop('URL');
          }
          return baseURI.replace(/#$/, '').replace(/\/+$/, '/');
        })(),
        absoluteURI: function(path) {
          return "" + this.baseURI + (path.replace(/^\//, ''));
        }
      };
    }
  ];

  angular.module('h.helpers').factory('documentHelpers', createDocumentHelpers);

}).call(this);
