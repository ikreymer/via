(function() {
  var AUTH_SESSION_ACTIONS, AccountController, AuthAppController, AuthController, AuthPageController, configure, imports,
    __hasProp = {}.hasOwnProperty;

  imports = ['ngRoute', 'h.identity', 'h.helpers', 'h.session'];

  AUTH_SESSION_ACTIONS = ['login', 'logout', 'register', 'forgot_password', 'reset_password', 'edit_profile', 'disable_user'];

  AuthAppController = (function() {
    AuthAppController.$inject = ['$location', '$scope', '$timeout', '$window', 'session'];

    function AuthAppController($location, $scope, $timeout, $window, session) {
      var onlogin;
      onlogin = function() {
        return $window.location.href = '/stream';
      };
      $scope.auth = {};
      $scope.model = {};
      $scope.auth.tab = $location.path().split('/')[1];
      $scope.$on('auth', function(event, err, data) {
        if (data != null ? data.userid : void 0) {
          return $timeout(onlogin, 1000);
        }
      });
      $scope.$watch('auth.tab', function(tab, old) {
        if (tab !== old) {
          return $location.path("/" + tab);
        }
      });
      session.load(function(data) {
        if (data.userid) {
          return onlogin();
        }
      });
    }

    return AuthAppController;

  })();

  AuthPageController = (function() {
    AuthPageController.$inject = ['$routeParams', '$scope'];

    function AuthPageController($routeParams, $scope) {
      angular.extend($scope.model, $routeParams);
    }

    return AuthPageController;

  })();

  configure = [
    '$httpProvider', '$locationProvider', '$routeProvider', 'identityProvider', 'sessionProvider', function($httpProvider, $locationProvider, $routeProvider, identityProvider, sessionProvider) {
      var action, authCheck, _i, _len, _results;
      authCheck = null;
      $httpProvider.defaults.xsrfHeaderName = 'X-CSRF-Token';
      $locationProvider.html5Mode(true);
      $routeProvider.when('/login', {
        controller: 'AuthPageController',
        templateUrl: 'auth.html'
      });
      $routeProvider.when('/register', {
        controller: 'AuthPageController',
        templateUrl: 'auth.html'
      });
      $routeProvider.when('/forgot_password', {
        controller: 'AuthPageController',
        templateUrl: 'auth.html'
      });
      $routeProvider.when('/reset_password/:code?', {
        controller: 'AuthPageController',
        templateUrl: 'auth.html'
      });
      identityProvider.checkAuthentication = [
        '$q', 'session', function($q, session) {
          return (authCheck = $q.defer()).promise.then((function() {
            return session.load().$promise.then(function(data) {
              if (data.userid) {
                return authCheck.resolve(data.csrf);
              } else {
                return authCheck.reject('no session');
              }
            }, function() {
              return authCheck.reject('request failure');
            });
          })());
        }
      ];
      identityProvider.forgetAuthentication = [
        '$q', 'flash', 'session', function($q, flash, session) {
          return session.logout({}).$promise.then(function() {
            authCheck = $q.defer();
            authCheck.reject('no session');
            return null;
          })["catch"](function(err) {
            flash('error', 'Sign out failed!');
            throw err;
          });
        }
      ];
      identityProvider.requestAuthentication = [
        '$q', '$rootScope', function($q, $rootScope) {
          return authCheck.promise["catch"](function() {
            var authRequest;
            return (authRequest = $q.defer()).promise["finally"]((function() {
              return $rootScope.$on('auth', function(event, err, data) {
                if (err) {
                  return authRequest.reject(err);
                } else {
                  return authRequest.resolve(data.csrf);
                }
              });
            })());
          });
        }
      ];
      sessionProvider.actions.load = {
        method: 'GET',
        withCredentials: true
      };
      _results = [];
      for (_i = 0, _len = AUTH_SESSION_ACTIONS.length; _i < _len; _i++) {
        action = AUTH_SESSION_ACTIONS[_i];
        _results.push(sessionProvider.actions[action] = {
          method: 'POST',
          params: {
            __formid__: action
          },
          withCredentials: true
        });
      }
      return _results;
    }
  ];

  angular.module('h.auth', imports, configure).controller('AuthAppController', AuthAppController).controller('AuthPageController', AuthPageController);

  AuthController = (function() {
    AuthController.$inject = ['$scope', '$timeout', 'flash', 'session', 'formHelpers'];

    function AuthController($scope, $timeout, flash, session, formHelpers) {
      var failure, success, timeout;
      timeout = null;
      success = function(data) {
        var _ref;
        if (data.userid) {
          $scope.$emit('auth', null, data);
        }
        $scope.auth.tab = (function() {
          switch ($scope.auth.tab) {
            case 'register':
              return 'login';
            case 'forgot_password':
              return 'reset_password';
            case 'reset_password':
              return 'login';
            default:
              return $scope.auth.tab;
          }
        })();
        angular.copy({}, $scope.model);
        return (_ref = $scope.form) != null ? _ref.$setPristine() : void 0;
      };
      failure = function(form, response) {
        var errors, reason, _ref;
        _ref = response.data, errors = _ref.errors, reason = _ref.reason;
        return formHelpers.applyValidationErrors(form, errors, reason);
      };
      this.submit = function(form) {
        formHelpers.applyValidationErrors(form);
        if (!form.$valid) {
          return;
        }
        $scope.$broadcast('formState', form.$name, 'loading');
        return session[form.$name]($scope.model, success, angular.bind(this, failure, form)).$promise["finally"](function() {
          return $scope.$broadcast('formState', form.$name, '');
        });
      };
      if ($scope.auth == null) {
        $scope.auth = {
          tab: 'login'
        };
      }
      if ($scope.model == null) {
        $scope.model = {};
      }
      $scope.$on('auth', (function() {
        var preventCancel;
        return preventCancel = $scope.$on('$destroy', function() {
          if (timeout) {
            $timeout.cancel(timeout);
          }
          return $scope.$emit('auth', 'cancel');
        });
      })());
      $scope.$watchCollection('model', function(value) {
        if (timeout) {
          $timeout.cancel(timeout);
        }
        if (value && !angular.equals(value, {})) {
          return timeout = $timeout(function() {
            var _ref;
            angular.copy({}, $scope.model);
            if ((_ref = $scope.form) != null) {
              _ref.$setPristine();
            }
            return flash('info', 'For your security, the forms have been reset due to inactivity.');
          }, 300000);
        }
      });
    }

    return AuthController;

  })();

  angular.module('h.auth').controller('AuthController', AuthController);

  AccountController = (function() {
    AccountController.inject = ['$scope', '$filter', 'flash', 'session', 'identity', 'formHelpers'];

    function AccountController($scope, $filter, flash, session, identity, formHelpers) {
      var onDelete, onError, onSuccess, persona_filter;
      persona_filter = $filter('persona');
      onSuccess = function(form, response) {
        var formModel, msgs, type, _ref;
        _ref = response.flash;
        for (type in _ref) {
          msgs = _ref[type];
          flash(type, msgs);
        }
        form.$setPristine();
        formModel = form.$name.slice(0, -4);
        $scope[formModel] = {};
        return $scope.$broadcast('formState', form.$name, 'success');
      };
      onDelete = function(form, response) {
        identity.logout();
        return onSuccess(form, response);
      };
      onError = function(form, response) {
        var msgs, type, _ref;
        if (response.status >= 400 && response.status < 500) {
          formHelpers.applyValidationErrors(form, response.data.errors);
        } else {
          if (response.data.flash) {
            _ref = response.data.flash;
            for (type in _ref) {
              if (!__hasProp.call(_ref, type)) continue;
              msgs = _ref[type];
              flash(type, msgs);
            }
          } else {
            flash('error', 'Sorry, we were unable to perform your request');
          }
        }
        return $scope.$broadcast('formState', form.$name, '');
      };
      $scope.editProfile = {};
      $scope.changePassword = {};
      $scope.deleteAccount = {};
      $scope["delete"] = function(form) {
        var errorHandler, packet, promise, successHandler, username;
        if (!form.$valid) {
          return;
        }
        username = persona_filter($scope.persona);
        packet = {
          username: username,
          pwd: form.pwd.$modelValue
        };
        successHandler = angular.bind(null, onDelete, form);
        errorHandler = angular.bind(null, onError, form);
        promise = session.disable_user(packet);
        return promise.$promise.then(successHandler, errorHandler);
      };
      $scope.submit = function(form) {
        var errorHandler, packet, promise, successHandler, username;
        formHelpers.applyValidationErrors(form);
        if (!form.$valid) {
          return;
        }
        username = persona_filter($scope.persona);
        packet = {
          username: username,
          pwd: form.pwd.$modelValue,
          password: form.password.$modelValue
        };
        successHandler = angular.bind(null, onSuccess, form);
        errorHandler = angular.bind(null, onError, form);
        $scope.$broadcast('formState', form.$name, 'loading');
        promise = session.edit_profile(packet);
        return promise.$promise.then(successHandler, errorHandler);
      };
    }

    return AccountController;

  })();

  angular.module('h.auth').controller('AccountController', AccountController);

}).call(this);
