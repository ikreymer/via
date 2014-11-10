(function() {
  var AnnotationController, AnnotationViewerController, AppController, COLLAPSED_CLASS, Converter, DeepCountController, DraftProvider, Hypothesis, QueryParser, SearchFilter, Socket, StreamFilter, StreamSearchController, ThreadController, ThreadFilterController, ViewFilter, ViewerController, annotation, authorizeAction, clientID, configure, deepCount, extractURIComponent, fuzzyTime, identityProvider, imports, loadMathJax, markdown, match, momentFilter, persona, privacy, renderFactory, repeatAnim, resolve, run, simpleSearch, socket, statusButton, thread, threadFilter, validate, whenscrolled,
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  imports = ['ngAnimate', 'ngRoute', 'ngSanitize', 'ngTagsInput', 'h.auth', 'h.helpers', 'h.identity'];

  resolve = {
    storeConfig: [
      '$q', 'annotator', function($q, annotator) {
        var storeReady;
        if (annotator.plugins.Store) {
          return;
        }
        storeReady = $q.defer();
        resolve = function(options) {
          var _base;
          if ((_base = annotator.options).Store == null) {
            _base.Store = {};
          }
          angular.extend(annotator.options.Store, options);
          return storeReady.resolve();
        };
        annotator.subscribe('serviceDiscovery', resolve);
        return storeReady.promise["finally"](function() {
          return annotator.unsubscribe('serviceDiscovery', resolve);
        });
      }
    ]
  };

  configure = [
    '$locationProvider', '$routeProvider', '$sceDelegateProvider', function($locationProvider, $routeProvider, $sceDelegateProvider) {
      var basePattern, baseTags, baseURI;
      $locationProvider.html5Mode(true);
      $routeProvider.when('/a/:id', {
        controller: 'AnnotationViewerController',
        templateUrl: 'viewer.html',
        resolve: resolve
      });
      $routeProvider.when('/viewer', {
        controller: 'ViewerController',
        templateUrl: 'viewer.html',
        reloadOnSearch: false,
        resolve: resolve
      });
      $routeProvider.when('/stream', {
        controller: 'StreamSearchController',
        templateUrl: 'viewer.html',
        resolve: resolve
      });
      $routeProvider.otherwise({
        redirectTo: '/viewer'
      });
      baseURI = document.baseURI;
      if (!baseURI) {
        baseTags = document.getElementsByTagName("base");
        baseURI = baseTags.length ? baseTags[0].href : document.URL;
      }
      basePattern = baseURI.replace(/\/[^\/]*$/, '/**.html');
      return $sceDelegateProvider.resourceUrlWhitelist(['self', basePattern]);
    }
  ];

  angular.module('h', imports, configure);

  authorizeAction = function(action, annotation, user) {
    var token, tokens, _i, _len;
    if (annotation.permissions) {
      tokens = annotation.permissions[action] || [];
      if (tokens.length === 0) {
        return false;
      }
      for (_i = 0, _len = tokens.length; _i < _len; _i++) {
        token = tokens[_i];
        if (user === token) {
          return true;
        }
        if (token === 'group:__world__') {
          return true;
        }
      }
      return false;
    } else if (annotation.user) {
      return user && user === annotation.user;
    }
    return true;
  };

  AppController = (function() {
    AppController.$inject = ['$location', '$q', '$route', '$scope', '$timeout', 'annotator', 'flash', 'identity', 'socket', 'streamfilter', 'documentHelpers', 'drafts'];

    function AppController($location, $q, $route, $scope, $timeout, annotator, flash, identity, socket, streamfilter, documentHelpers, drafts) {
      var applyUpdates, host, initStore, initUpdater, isFirstRun, oncancel, onlogin, onlogout, onready, plugins, providers, reset;
      plugins = annotator.plugins, host = annotator.host, providers = annotator.providers;
      isFirstRun = $location.search().hasOwnProperty('firstrun');
      applyUpdates = function(action, data) {
        "Update the application with new data from the websocket.";
        var annotation, _i, _len, _ref, _ref1, _ref2, _results;
        if (!(data != null ? data.length : void 0)) {
          return;
        }
        if (action === 'past') {
          action = 'create';
        }
        switch (action) {
          case 'create':
          case 'update':
            return (_ref = plugins.Store) != null ? _ref._onLoadAnnotations(data) : void 0;
          case 'delete':
            _results = [];
            for (_i = 0, _len = data.length; _i < _len; _i++) {
              annotation = data[_i];
              annotation = (_ref1 = plugins.Threading.idTable[annotation.id]) != null ? _ref1.message : void 0;
              if (annotation == null) {
                continue;
              }
              if ((_ref2 = plugins.Store) != null) {
                _ref2.unregisterAnnotation(annotation);
              }
              _results.push(annotator.deleteAnnotation(annotation));
            }
            return _results;
        }
      };
      initStore = function() {
        "Initialize the storage component.";
        var Store, cleanup, cull, drop, keep, user, view, _ref;
        Store = plugins.Store;
        delete plugins.Store;
        if ($scope.persona || annotator.socialView.name === 'none') {
          annotator.addPlugin('Store', annotator.options.Store);
          $scope.store = plugins.Store;
        }
        if (!Store) {
          return;
        }
        Store.destroy();
        Store.annotator = {
          loadAnnotations: angular.noop
        };
        Store._apiRequest = angular.noop;
        Store._onLoadAnnotations = angular.noop;
        Store.updateAnnotation = angular.noop;
        user = $scope.persona;
        view = annotator.socialView.name;
        cull = function(acc, annotation) {
          if (view === 'single-player' && annotation.user !== user) {
            acc.drop.push(annotation);
          } else if (authorizeAction('read', annotation, user)) {
            acc.keep.push(annotation);
          } else {
            acc.drop.push(annotation);
          }
          return acc;
        };
        _ref = Store.annotations.reduce(cull, {
          keep: [],
          drop: []
        }), keep = _ref.keep, drop = _ref.drop;
        Store.annotations = [];
        if (plugins.Store != null) {
          plugins.Store.annotations = keep;
        } else {
          drop = drop.concat(keep);
        }
        return (cleanup = function(drop) {
          var first, rest;
          if (drop.length === 0) {
            return;
          }
          first = drop[0], rest = 2 <= drop.length ? __slice.call(drop, 1) : [];
          annotator.deleteAnnotation(first);
          return $timeout(function() {
            return cleanup(rest);
          });
        })(drop);
      };
      initUpdater = function(failureCount) {
        var _dfdSock, _ref, _sock;
        if (failureCount == null) {
          failureCount = 0;
        }
        "Initialize the websocket used for realtime updates.";
        _dfdSock = $q.defer();
        _sock = socket();
        if ((_ref = $scope.updater) != null) {
          _ref.then(function(sock) {
            sock.onclose = null;
            return sock.close();
          });
        }
        $scope.updater = _dfdSock.promise;
        _sock.onopen = function() {
          failureCount = 0;
          _dfdSock.resolve(_sock);
          return _dfdSock = null;
        };
        _sock.onclose = function() {
          var slots;
          failureCount = Math.min(10, ++failureCount);
          slots = Math.random() * (Math.pow(2, failureCount) - 1);
          return $timeout(function() {
            var _retry;
            _retry = initUpdater(failureCount);
            return _dfdSock != null ? _dfdSock.resolve(_retry) : void 0;
          }, slots * 500);
        };
        _sock.onmessage = function(msg) {
          var action, data, owndata, p, user;
          if (!((msg.data.type != null) && msg.data.type === 'annotation-notification')) {
            return;
          }
          data = msg.data.payload;
          action = msg.data.options.action;
          if (!(data instanceof Array)) {
            data = [data];
          }
          p = $scope.persona;
          user = p != null ? "acct:" + p.username + "@" + p.provider : '';
          if (!(data instanceof Array)) {
            data = [data];
          }
          if ($scope.socialView.name === 'single-player') {
            owndata = data.filter(function(d) {
              return d.user === user;
            });
            applyUpdates(action, owndata);
          } else {
            applyUpdates(action, data);
          }
          return $scope.$digest();
        };
        return _dfdSock.promise;
      };
      onlogin = function(assertion) {
        annotator.addPlugin('Auth', {
          tokenUrl: documentHelpers.absoluteURI("/api/token?assertion=" + assertion)
        });
        return plugins.Auth.withToken(function(token) {
          annotator.addPlugin('Permissions', {
            user: token.userId,
            userAuthorize: authorizeAction,
            permissions: {
              read: [token.userId],
              update: [token.userId],
              "delete": [token.userId],
              admin: [token.userId]
            }
          });
          return $scope.$apply(function() {
            $scope.persona = token.userId;
            return reset();
          });
        });
      };
      onlogout = function() {
        var _ref, _ref1, _ref2, _ref3;
        if ((_ref = plugins.Auth) != null) {
          _ref.element.removeData('annotator:headers');
        }
        if ((_ref1 = plugins.Auth) != null) {
          _ref1.destroy();
        }
        delete plugins.Auth;
        if ((_ref2 = plugins.Permissions) != null) {
          _ref2.setUser(null);
        }
        if ((_ref3 = plugins.Permissions) != null) {
          _ref3.destroy();
        }
        delete plugins.Permissions;
        $scope.persona = null;
        return reset();
      };
      onready = function() {
        if (plugins.Auth === void 0) {
          $scope.persona = null;
          reset();
        }
        if (isFirstRun) {
          return $scope.login();
        }
      };
      oncancel = function() {
        return $scope.dialog.visible = false;
      };
      reset = function() {
        var draft, _i, _len, _ref;
        $scope.dialog.visible = false;
        _ref = drafts.all();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          draft = _ref[_i];
          annotator.publish('beforeAnnotationCreated', draft);
        }
        initStore();
        return initUpdater();
      };
      identity.watch({
        onlogin: onlogin,
        onlogout: onlogout,
        onready: onready
      });
      $scope.$watch('socialView.name', function(newValue, oldValue) {
        if (newValue === oldValue) {
          return;
        }
        initStore();
        if (newValue === 'single-player' && !$scope.persona) {
          annotator.show();
          return flash('info', 'You will need to sign in for your highlights to be saved.');
        }
      });
      $scope.$watch('sort.name', function(name) {
        var predicate;
        if (!name) {
          return;
        }
        predicate = (function() {
          switch (name) {
            case 'Newest':
              return ['-!!message', '-message.updated'];
            case 'Oldest':
              return ['-!!message', 'message.updated'];
            case 'Location':
              return ['-!!message', 'message.target[0].pos.top'];
          }
        })();
        return $scope.sort = {
          name: name,
          predicate: predicate
        };
      });
      $scope.$watch('store.entities', function(entities, oldEntities) {
        if (entities === oldEntities) {
          return;
        }
        if (entities.length) {
          streamfilter.resetFilter().addClause('/uri', 'one_of', entities);
          return $scope.updater.then(function(sock) {
            var filter;
            filter = streamfilter.getFilter();
            return sock.send(JSON.stringify({
              filter: filter
            }));
          });
        }
      });
      $scope.login = function() {
        $scope.dialog.visible = true;
        return identity.request({
          oncancel: oncancel
        });
      };
      $scope.logout = function() {
        if (!drafts.discard()) {
          return;
        }
        $scope.dialog.visible = false;
        return identity.logout();
      };
      $scope.loadMore = function(number) {
        var sockmsg;
        if (!streamfilter.getPastData().hits) {
          return;
        }
        if ($scope.updater == null) {
          return;
        }
        sockmsg = {
          messageType: 'more_hits',
          moreHits: number
        };
        return $scope.updater.then(function(sock) {
          return sock.send(JSON.stringify(sockmsg));
        });
      };
      $scope.clearSelection = function() {
        $scope.search.query = '';
        $scope.selectedAnnotations = null;
        return $scope.selectedAnnotationsCount = 0;
      };
      $scope.dialog = {
        visible: false
      };
      $scope.search = {
        query: $location.search()['q'],
        clear: function() {
          return $location.search('q', null);
        },
        update: function(query) {
          if (!angular.equals($location.search()['q'], query)) {
            $location.search('q', query || null);
            delete $scope.selectedAnnotations;
            return delete $scope.selectedAnnotationsCount;
          }
        }
      };
      $scope.socialView = annotator.socialView;
      $scope.sort = {
        name: 'Location'
      };
      $scope.threading = plugins.Threading;
    }

    return AppController;

  })();

  AnnotationViewerController = (function() {
    AnnotationViewerController.$inject = ['$location', '$routeParams', '$scope', 'annotator', 'streamfilter'];

    function AnnotationViewerController($location, $routeParams, $scope, annotator, streamfilter) {
      var _ref, _ref1;
      $scope.isEmbedded = false;
      $scope.isStream = false;
      if ((_ref = annotator.plugins.Threading) != null) {
        _ref.pluginInit();
      }
      if ((_ref1 = annotator.plugins.Store) != null) {
        _ref1.annotations = [];
      }
      $scope.activate = angular.noop;
      $scope.shouldShowThread = function() {
        return true;
      };
      $scope.search.update = function(query) {
        return $location.path('/stream').search('q', query);
      };
      $scope.$watch('updater', function(updater) {
        if (updater != null) {
          return updater.then(function(sock) {
            var filter, _id, _ref2;
            if ($routeParams.id != null) {
              _id = $routeParams.id;
              if ((_ref2 = annotator.plugins.Store) != null) {
                _ref2.loadAnnotationsFromSearch({
                  _id: _id
                }).then(function() {
                  var _ref3;
                  return (_ref3 = annotator.plugins.Store) != null ? _ref3.loadAnnotationsFromSearch({
                    references: _id
                  }) : void 0;
                });
              }
              filter = streamfilter.setPastDataNone().setMatchPolicyIncludeAny().addClause('/references', 'first_of', _id, true).addClause('/id', 'equals', _id, true).getFilter();
              return sock.send(JSON.stringify({
                filter: filter
              }));
            }
          });
        }
      });
    }

    return AnnotationViewerController;

  })();

  ViewerController = (function() {
    ViewerController.$inject = ['$scope', 'annotator'];

    function ViewerController($scope, annotator) {
      $scope.isEmbedded = true;
      $scope.isStream = true;
      $scope.activate = function(annotation) {
        var highlights, p, _i, _len, _ref, _results;
        if (angular.isObject(annotation)) {
          highlights = [annotation.$$tag];
        } else {
          highlights = [];
        }
        _ref = annotator.providers;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          p = _ref[_i];
          _results.push(p.channel.notify({
            method: 'setActiveHighlights',
            params: highlights
          }));
        }
        return _results;
      };
      $scope.shouldShowThread = function(container) {
        var _ref;
        if (($scope.selectedAnnotations != null) && !container.parent.parent) {
          return $scope.selectedAnnotations[(_ref = container.message) != null ? _ref.id : void 0];
        } else {
          return true;
        }
      };
    }

    return ViewerController;

  })();

  angular.module('h').controller('AppController', AppController).controller('ViewerController', ViewerController).controller('AnnotationViewerController', AnnotationViewerController);

  privacy = function() {
    var levels;
    levels = ['Public', 'Only Me'];
    return {
      link: function(scope, elem, attrs, controller) {
        if (controller == null) {
          return;
        }
        controller.$formatters.push(function(permissions) {
          if (permissions == null) {
            return;
          }
          if (__indexOf.call(permissions.read || [], 'group:__world__') >= 0) {
            return 'Public';
          } else {
            return 'Only Me';
          }
        });
        controller.$parsers.push(function(privacy) {
          var permissions, read, role;
          if (privacy == null) {
            return;
          }
          permissions = controller.$modelValue;
          if (privacy === 'Public') {
            if (permissions.read) {
              if (__indexOf.call(permissions.read, 'group:__world__') < 0) {
                permissions.read.push('group:__world__');
              }
            } else {
              permissions.read = ['group:__world__'];
            }
          } else {
            read = permissions.read || [];
            read = (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = read.length; _i < _len; _i++) {
                role = read[_i];
                if (role !== 'group:__world__') {
                  _results.push(role);
                }
              }
              return _results;
            })();
            permissions.read = read;
          }
          return permissions;
        });
        controller.$render = function() {
          return scope.level = controller.$viewValue;
        };
        scope.levels = levels;
        return scope.setLevel = function(level) {
          controller.$setViewValue(level);
          return controller.$render();
        };
      },
      require: '?ngModel',
      restrict: 'E',
      scope: {},
      templateUrl: 'privacy.html'
    };
  };

  repeatAnim = function() {
    return {
      restrict: 'A',
      scope: {
        array: '='
      },
      template: '<div ng-init="runAnimOnLast()"><div ng-transclude></div></div>',
      transclude: true,
      controller: function($scope, $element, $attrs) {
        return $scope.runAnimOnLast = function() {
          var item, itemElm;
          item = $scope.array[0];
          itemElm = jQuery($element).children().first().children();
          if (item._anim == null) {
            return;
          }
          if (item._anim === 'fade') {
            itemElm.css({
              opacity: 0
            }).animate({
              opacity: 1
            }, 1500);
          } else {
            if (item._anim === 'slide') {
              itemElm.css({
                'margin-left': itemElm.width()
              }).animate({
                'margin-left': '0px'
              }, 1500);
            }
          }
        };
      }
    };
  };

  whenscrolled = function() {
    return {
      link: function(scope, elem, attr) {
        return elem.bind('scroll', function() {
          var clientHeight, scrollHeight, scrollTop, _ref;
          _ref = elem[0], clientHeight = _ref.clientHeight, scrollHeight = _ref.scrollHeight, scrollTop = _ref.scrollTop;
          if (scrollHeight - scrollTop <= clientHeight + 40) {
            return scope.$apply(attr.whenscrolled);
          }
        });
      }
    };
  };

  match = function() {
    return {
      link: function(scope, elem, attr, input) {
        var validate;
        validate = function() {
          return scope.$evalAsync(function() {
            return input.$setValidity('match', scope.match === input.$modelValue);
          });
        };
        elem.on('keyup', validate);
        return scope.$watch('match', validate);
      },
      scope: {
        match: '='
      },
      restrict: 'A',
      require: 'ngModel'
    };
  };

  angular.module('h').directive('privacy', privacy).directive('repeatAnim', repeatAnim).directive('whenscrolled', whenscrolled).directive('match', match);


  /**
   * @ngdoc type
   * @name threadFilter.ThreadFilterController
   *
   * @property {boolean} match True if the last checked message was a match.
   *
   * @description
   * `ThreadFilterController` provides an API for maintaining filtering over
   * a message thread.
   */

  ThreadFilterController = [
    'viewFilter', function(viewFilter) {
      this.match = false;
      this._active = false;
      this._children = [];
      this._filters = null;
      this._frozen = false;

      /**
       * @ngdoc method
       * @name threadFilter.ThreadFilterController#active
       *
       * @param {boolean=} active New state
       * @return {boolean} state
       *
       * @description
       * This method is a getter / setter.
       *
       * Activate or deactivate filtering when called with an argument and
       * return the activation status.
       */
      this.active = function(active) {
        var child, _i, _len, _ref;
        if (active === void 0) {
          return this._active;
        } else if (this.active === active) {
          return this._active;
        } else {
          _ref = this._children;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            child.active(active);
          }
          if (this._frozen) {
            return this._active;
          } else {
            return this._active = active;
          }
        }
      };

      /**
       * @ngdoc method
       * @name threadFilter.ThreadFilterController#filters
       *
       * @param {Object=} filters New filters
       * @return {Object} filters
       *
       * @description
       * This method is a getter / setter.
       *
       * Set the filter configuration when called with an argument and return
       * return the configuration.
       */
      this.filters = function(filters) {
        var child, _i, _len, _ref;
        if (filters === void 0) {
          return this._filters;
        } else if (this.filters === filters) {
          return this._filters;
        } else {
          _ref = this._children;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            child.filters(filters);
          }
          if (this._frozen) {
            return this._filters;
          } else {
            return this._filters = filters;
          }
        }
      };

      /**
       * @ngdoc method
       * @name threadFilter.ThreadFilterController#freeze
       *
       * @param {boolean=} frozen New state
       * @return {boolean} frozen state
       *
       * @description
       * This method is a getter / setter.
       *
       * Freeze or unfreeze the filter when called with an argument and
       * return the frozen state. A frozen filter will not change its activation
       * state or filter configuration.
       */
      this.freeze = function(frozen) {
        if (frozen == null) {
          frozen = true;
        }
        if (frozen != null) {
          return this._frozen = frozen;
        } else {
          return this._frozen;
        }
      };

      /**
       * @ngdoc method
       * @name threadFilter.ThreadFilterController#check
       *
       * @param {Object} container The `mail.messageContainer` to filter.
       * @return {boolean} True if the message matches the filters, it has not
       * yet been saved, or if filtering is not active.
       *
       * @description
       * Check whether a message container carries a message matching the
       * configured filters. If filtering is not active then the result is
       * always `true`. Updates the `match` property to reflect the result.
       */
      this.check = function(container) {
        if (!(container != null ? container.message : void 0)) {
          return false;
        }
        if (this.active()) {
          return this.match = !!viewFilter.filter([container.message], this._filters).length;
        } else {
          return this.match = true;
        }
      };

      /**
       * @ngdoc method
       * @name threadFilter.ThreadFilterController#registerChild
       *
       * @param {Object} target The child controller instance.
       *
       * @description
       * Add another instance of the thread filter controller to the set of
       * registered children. Changes in activation status and filter configuration
       * are propagated to child controllers.
       */
      this.registerChild = function(target) {
        return this._children.push(target);
      };

      /**
       * @ngdoc method
       * @name threadFilter.ThreadFilterController#unregisterChild
       *
       * @param {Object} target The child controller instance.
       *
       * @description
       * Remove a previously registered instance of the thread filter controller
       * from the set of registered children.
       */
      this.unregisterChild = function(target) {
        var child;
        return this._children = ((function() {
          var _i, _len, _ref, _results;
          if (child !== target) {
            _ref = this._children;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              child = _ref[_i];
              _results.push(child);
            }
            return _results;
          }
        }).call(this));
      };
      return this;
    }
  ];


  /**
   * @ngdoc directive
   * @name threadFilter
   * @restrict A
   * @description
   * Directive that instantiates
   * {@link threadFilter.ThreadFilterController ThreadController}.
   *
   * The threadFilter directive utilizes the {@link searchfilter searchfilter}
   * service to parse the expression passed in the directive attribute as a
   * faceted search query and configures its controller with the resulting
   * filters. It watches the `match` property of the controller and updates
   * its thread's message count under the 'filter' key.
   */

  threadFilter = [
    '$parse', 'searchfilter', function($parse, searchfilter) {
      var linkFn;
      linkFn = function(scope, elem, attrs, _arg) {
        var counter, ctrl, parentCtrl, thread;
        ctrl = _arg[0], thread = _arg[1], counter = _arg[2];
        if (counter != null) {
          scope.$watch((function() {
            return ctrl.match;
          }), function(match, old) {
            if (match && !old) {
              return counter.count('match', 1);
            } else if (old) {
              return counter.count('match', -1);
            }
          });
          scope.$on('$destroy', function() {
            if (ctrl.match) {
              return counter.count('match', -1);
            }
          });
        }
        if (parentCtrl = elem.parent().controller('threadFilter')) {
          ctrl.filters(parentCtrl.filters());
          ctrl.active(parentCtrl.active());
          parentCtrl.registerChild(ctrl);
          return scope.$on('$destroy', function() {
            return parentCtrl.unregisterChild(ctrl);
          });
        } else {
          return scope.$watch($parse(attrs.threadFilter), function(query) {
            var filters;
            if (!query) {
              return ctrl.active(false);
            }
            filters = searchfilter.generateFacetedFilter(query);
            ctrl.filters(filters);
            return ctrl.active(true);
          });
        }
      };
      return {
        controller: 'ThreadFilterController',
        controllerAs: 'threadFilter',
        link: linkFn,
        require: ['threadFilter', 'thread', '?^deepCount']
      };
    }
  ];

  angular.module('h').controller('ThreadFilterController', ThreadFilterController).directive('threadFilter', threadFilter);

  simpleSearch = [
    '$parse', function($parse) {
      var uuid;
      uuid = 0;
      return {
        link: function(scope, elem, attr, ctrl) {
          scope.viewId = uuid++;
          scope.reset = function(event) {
            event.preventDefault();
            return scope.query = '';
          };
          scope.search = function(event) {
            event.preventDefault();
            return scope.query = scope.searchtext;
          };
          return scope.$watch('query', function(query) {
            if (query === void 0) {
              return;
            }
            scope.searchtext = query;
            if (query) {
              return typeof scope.onSearch === "function" ? scope.onSearch({
                query: scope.searchtext
              }) : void 0;
            } else {
              return typeof scope.onClear === "function" ? scope.onClear() : void 0;
            }
          });
        },
        restrict: 'C',
        scope: {
          query: '=',
          onSearch: '&',
          onClear: '&'
        },
        template: '<form class="simple-search-form" ng-class="!searchtext && \'simple-search-inactive\'" name="searchBox" ng-submit="search($event)">\n  <input id="simple-search-{{viewId}}" class="simple-search-input" type="text" ng-model="searchtext" name="searchText" placeholder="Search…" />\n  <label for="simple-search-{{viewId}}" class="simple-search-icon h-icon-search"></label>\n  <button class="simple-search-clear" type="reset" ng-hide="!searchtext" ng-click="reset($event)">\n    <i class="h-icon-x"></i>\n  </button>\n</form>'
      };
    }
  ];

  angular.module('h').directive('simpleSearch', simpleSearch);

  loadMathJax = function() {
    if (typeof MathJax === "undefined" || MathJax === null) {
      return $.ajax({
        url: "//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML-full",
        dataType: 'script',
        cache: true,
        complete: function() {
          return MathJax.Hub.Config({
            showMathMenu: false
          });
        }
      });
    }
  };


  /**
   * @ngdoc directive
   * @name markdown
   * @restrict A
   * @description
   * This directive controls both the rendering and display of markdown, as well as
   * the markdown editor.
   */

  markdown = [
    '$filter', '$sanitize', '$sce', '$timeout', function($filter, $sanitize, $sce, $timeout) {
      return {
        link: function(scope, elem, attr, ctrl) {
          var applyInlineMarkup, input, inputEl, insertMarkup, mathJaxFallback, output, renderInlineMath, renderMathAndMarkdown, userSelection;
          if (ctrl == null) {
            return;
          }
          inputEl = elem.find('.js-markdown-input');
          input = elem.find('.js-markdown-input')[0];
          output = elem.find('.js-markdown-preview')[0];
          userSelection = function() {
            var endPos, selectedText, selection, startPos, textAfter, textBefore;
            if (input.selectionStart !== void 0) {
              startPos = input.selectionStart;
              endPos = input.selectionEnd;
              selectedText = input.value.substring(startPos, endPos);
              textBefore = input.value.substring(0, startPos);
              textAfter = input.value.substring(endPos);
              selection = {
                before: textBefore,
                after: textAfter,
                selection: selectedText,
                start: startPos,
                end: endPos
              };
            }
            return selection;
          };
          insertMarkup = function(value, selectionStart, selectionEnd) {
            input.value = value;
            input.selectionStart = selectionStart;
            input.selectionEnd = selectionEnd;
            return input.focus();
          };
          applyInlineMarkup = function(markupL, innertext, markupR) {
            var end, newtext, slice1, slice2, start, text;
            markupR || (markupR = markupL);
            text = userSelection();
            if (text.selection === "") {
              newtext = text.before + markupL + innertext + markupR + text.after;
              start = (text.before + markupL).length;
              end = (text.before + innertext + markupR).length;
              return insertMarkup(newtext, start, end);
            } else {
              slice1 = text.before.slice(text.before.length - markupL.length);
              slice2 = text.after.slice(0, markupR.length);
              if (slice1 === markupL && slice2 === markupR) {
                newtext = text.before.slice(0, text.before.length - markupL.length) + text.selection + text.after.slice(markupR.length);
                start = text.before.length - markupL.length;
                end = (text.before + text.selection).length - markupR.length;
                return insertMarkup(newtext, start, end);
              } else {
                newtext = text.before + markupL + text.selection + markupR + text.after;
                start = (text.before + markupL).length;
                end = (text.before + text.selection + markupR).length;
                return insertMarkup(newtext, start, end);
              }
            }
          };
          scope.insertBold = function() {
            return applyInlineMarkup("**", "Bold");
          };
          scope.insertItalic = function() {
            return applyInlineMarkup("*", "Italic");
          };
          scope.insertMath = function() {
            var index, text;
            text = userSelection();
            index = text.before.length;
            if (index === 0 || input.value[index - 1] === '\n' || (input.value[index - 1] === '$' && input.value[index - 2] === '$')) {
              return applyInlineMarkup('$$', 'LaTeX or MathML');
            } else {
              return applyInlineMarkup('\\(', 'LaTeX or MathML', '\\)');
            }
          };
          scope.insertLink = function() {
            var end, newtext, start, text;
            text = userSelection();
            if (text.selection === "") {
              newtext = text.before + "[Link Text](https://example.com)" + text.after;
              start = text.before.length + 1;
              end = text.before.length + 10;
              return insertMarkup(newtext, start, end);
            } else {
              if (text.selection === "Link Text" || text.selection === "https://example.com") {
                return;
              }
              newtext = text.before + '[' + text.selection + '](https://example.com)' + text.after;
              start = (text.before + text.selection).length + 3;
              end = (text.before + text.selection).length + 22;
              return insertMarkup(newtext, start, end);
            }
          };
          scope.insertIMG = function() {
            var end, newtext, start, text;
            text = userSelection();
            if (text.selection === "") {
              newtext = text.before + "![Image Description](https://yourimage.jpg)" + text.after;
              start = text.before.length + 21;
              end = text.before.length + 42;
              return insertMarkup(newtext, start, end);
            } else {
              if (text.selection === "https://yourimage.jpg") {
                return;
              }
              newtext = text.before + '![' + text.selection + '](https://yourimage.jpg)' + text.after;
              start = (text.before + text.selection).length + 4;
              end = (text.before + text.selection).length + 25;
              return insertMarkup(newtext, start, end);
            }
          };
          scope.applyBlockMarkup = function(markup) {
            var char, end, i, index, indexoflastnewline, newlinedetected, newstring, newtext, start, text, value, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3;
            text = userSelection();
            if (text.selection !== "") {
              newstring = "";
              index = text.before.length;
              if (index === 0) {
                _ref = text.selection;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  char = _ref[_i];
                  if (char === "\n") {
                    newstring = newstring + "\n" + markup;
                  } else if (index === 0) {
                    newstring = newstring + markup + char;
                  } else {
                    newstring = newstring + char;
                  }
                  index += 1;
                }
              } else {
                newlinedetected = false;
                if (input.value.substring(index - 1).charAt(0) === "\n") {
                  newstring = newstring + markup;
                  newlinedetected = true;
                }
                _ref1 = text.selection;
                for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                  char = _ref1[_j];
                  if (char === "\n") {
                    newstring = newstring + "\n" + markup;
                    newlinedetected = true;
                  } else {
                    newstring = newstring + char;
                  }
                  index += 1;
                }
                if (!newlinedetected) {
                  i = 0;
                  indexoflastnewline = void 0;
                  newstring = "";
                  _ref2 = text.before + text.selection;
                  for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                    char = _ref2[_k];
                    if (char === "\n") {
                      indexoflastnewline = i;
                    }
                    newstring = newstring + char;
                    i++;
                  }
                  if (indexoflastnewline === void 0) {
                    newstring = markup + newstring;
                  } else {
                    newstring = newstring.substring(0, indexoflastnewline + 1) + markup + newstring.substring(indexoflastnewline + 1);
                  }
                  value = newstring + text.after;
                  start = (text.before + markup).length;
                  end = (text.before + text.selection + markup).length;
                  insertMarkup(value, start, end);
                  return;
                }
              }
              value = text.before + newstring + text.after;
              start = (text.before + newstring).length;
              end = (text.before + newstring).length;
              return insertMarkup(value, start, end);
            } else if (input.value.substring(text.start - 1, text.start) === "\n") {
              value = text.before + markup + text.selection + text.after;
              start = (text.before + markup).length;
              end = (text.before + markup).length;
              return insertMarkup(value, start, end);
            } else {
              if (text.before.slice(text.before.length - markup.length) === markup) {
                newtext = text.before.substring(0, index) + "\n" + text.before.substring(index + 1 + markup.length) + text.after;
              }
              i = 0;
              _ref3 = text.before;
              for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
                char = _ref3[_l];
                if (char === "\n" && i !== 0) {
                  index = i;
                }
                i += 1;
              }
              if (!index) {
                if (text.before.slice(0, markup.length) === markup) {
                  newtext = text.before.substring(markup.length) + text.after;
                  start = text.before.length - markup.length;
                  end = text.before.length - markup.length;
                  return insertMarkup(newtext, start, end);
                } else {
                  newtext = markup + text.before.substring(0) + text.after;
                  start = (text.before + markup).length;
                  end = (text.before + markup).length;
                  return insertMarkup(newtext, start, end);
                }
              } else if (text.before.slice(index + 1, index + 1 + markup.length) === markup) {
                newtext = text.before.substring(0, index) + "\n" + text.before.substring(index + 1 + markup.length) + text.after;
                start = text.before.length - markup.length;
                end = text.before.length - markup.length;
                return insertMarkup(newtext, start, end);
              } else {
                newtext = text.before.substring(0, index) + "\n" + markup + text.before.substring(index + 1) + text.after;
                start = (text.before + markup).length;
                end = (text.before + markup).length;
                return insertMarkup(newtext, start, end);
              }
            }
          };
          scope.insertList = function() {
            return scope.applyBlockMarkup("* ");
          };
          scope.insertNumList = function() {
            return scope.applyBlockMarkup("1. ");
          };
          scope.insertQuote = function() {
            return scope.applyBlockMarkup("> ");
          };
          scope.insertCode = function() {
            return scope.applyBlockMarkup("    ");
          };
          elem.on({
            keydown: function(e) {
              var shortcut, shortcuts;
              shortcuts = {
                66: scope.insertBold,
                73: scope.insertItalic,
                75: scope.insertLink
              };
              shortcut = shortcuts[e.keyCode];
              if (shortcut && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                return shortcut();
              }
            }
          });
          scope.preview = false;
          scope.togglePreview = function() {
            if (!scope.readonly) {
              scope.preview = !scope.preview;
              if (scope.preview) {
                output.style.height = input.style.height;
                return ctrl.$render();
              } else {
                input.style.height = output.style.height;
                return $timeout(function() {
                  return inputEl.focus();
                });
              }
            }
          };
          mathJaxFallback = false;
          renderMathAndMarkdown = function(textToCheck) {
            var convert, endMath, index, indexes, parts, re, startMath;
            convert = $filter('converter');
            re = /\$\$/g;
            startMath = 0;
            endMath = 0;
            indexes = ((function() {
              var _results;
              _results = [];
              while (match = re.exec(textToCheck)) {
                _results.push(match.index);
              }
              return _results;
            })());
            indexes.push(textToCheck.length);
            parts = (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = indexes.length; _i < _len; _i++) {
                index = indexes[_i];
                if (startMath > endMath) {
                  endMath = index + 2;
                  try {
                    _results.push(katex.renderToString($sanitize(textToCheck.substring(startMath, index))));
                  } catch (_error) {
                    loadMathJax();
                    mathJaxFallback = true;
                    _results.push($sanitize(textToCheck.substring(startMath, index)));
                  }
                } else {
                  startMath = index + 2;
                  _results.push($sanitize(convert(renderInlineMath(textToCheck.substring(endMath, index)))));
                }
              }
              return _results;
            })();
            return parts.join('');
          };
          renderInlineMath = function(textToCheck) {
            var endMath, index, indexes, math, re, startMath, _i, _len;
            re = /\\?\\\(|\\?\\\)/g;
            startMath = null;
            endMath = null;
            match = void 0;
            indexes = [];
            while (match = re.exec(textToCheck)) {
              indexes.push(match.index);
            }
            for (_i = 0, _len = indexes.length; _i < _len; _i++) {
              index = indexes[_i];
              if (startMath === null) {
                startMath = index + 2;
              } else {
                endMath = index;
              }
              if (startMath !== null && endMath !== null) {
                math = katex.renderToString(textToCheck.substring(startMath, endMath));
                textToCheck = textToCheck.substring(0, startMath - 2) + math + textToCheck.substring(endMath + 2);
                startMath = null;
                endMath = null;
                return renderInlineMath(textToCheck);
              }
            }
            return textToCheck;
          };
          ctrl.$render = function() {
            var rendered, value;
            if (!scope.readonly && !scope.preview) {
              inputEl.val(ctrl.$viewValue || '');
            }
            value = ctrl.$viewValue || '';
            rendered = renderMathAndMarkdown(value);
            scope.rendered = $sce.trustAsHtml(rendered);
            if (mathJaxFallback) {
              return $timeout((function() {
                return typeof MathJax !== "undefined" && MathJax !== null ? MathJax.Hub.Queue(['Typeset', MathJax.Hub, output]) : void 0;
              }), 0, false);
            }
          };
          inputEl.bind('blur change keyup', function() {
            ctrl.$setViewValue(inputEl.val());
            return scope.$digest();
          });
          return scope.$watch('readonly', function(readonly) {
            scope.preview = false;
            output.style.height = "";
            ctrl.$render();
            if (!readonly) {
              return $timeout(function() {
                return inputEl.focus();
              });
            }
          });
        },
        require: '?ngModel',
        restrict: 'A',
        scope: {
          readonly: '@',
          required: '@'
        },
        templateUrl: 'markdown.html'
      };
    }
  ];

  angular.module('h').directive('markdown', markdown);

  statusButton = function() {
    var STATE_ATTRIBUTE, STATE_LOADING, STATE_SUCCESS, template;
    STATE_ATTRIBUTE = 'status-button-state';
    STATE_LOADING = 'loading';
    STATE_SUCCESS = 'success';
    template = '<span class="btn-with-message">\n  <span class="btn-message btn-message-loading">\n    <span class="btn-icon spinner"><span><span></span></span></span>\n  </span>\n  <span class="btn-message btn-message-success">\n    <span class="btn-message-text">Saved!</span> <i class="btn-message-icon h-icon-checkmark"></i>\n  </span>\n</span>';
    return {
      link: function(scope, placeholder, attr, ctrl, transclude) {
        var elem, targetForm;
        targetForm = attr.statusButton;
        if (!targetForm) {
          throw new Error('status-button attribute should provide a form name');
        }
        elem = angular.element(template).attr(STATE_ATTRIBUTE, '');
        placeholder.after(elem);
        transclude(scope, function(clone) {
          return elem.append(clone);
        });
        return scope.$on('formState', function(event, formName, formState) {
          if (formName !== targetForm) {
            return;
          }
          if (formState !== STATE_LOADING && formState !== STATE_SUCCESS) {
            formState = '';
          }
          return elem.attr(STATE_ATTRIBUTE, formState);
        });
      },
      transclude: 'element'
    };
  };

  angular.module('h').directive('statusButton', statusButton);


  /* global -COLLAPSED_CLASS */

  COLLAPSED_CLASS = 'thread-collapsed';


  /**
   * @ngdoc type
   * @name thread.ThreadController
   *
   * @property {Object} container The thread domain model. An instance of
   * `mail.messageContainer`.
   * @property {boolean} collapsed True if the thread is collapsed.
   *
   * @description
   * `ThreadController` provides an API for the thread directive controlling
   * the collapsing behavior.
   */

  ThreadController = [
    function() {
      this.container = null;
      this.collapsed = false;

      /**
       * @ngdoc method
       * @name thread.ThreadController#toggleCollapsed
       * @description
       * Toggle the collapsed property.
       */
      this.toggleCollapsed = function() {
        return this.collapsed = !this.collapsed;
      };

      /**
       * @ngdoc method
       * @name thread.ThreadController#showReplyToggle
       * @description
       * Determines whether the reply toggle button should be displayed for the
       * current thread.
       */
      this.showReplyToggle = function(messageCount) {
        return messageCount > 1 && !(this.collapsed && this.container.parent.parent);
      };
      return this;
    }
  ];


  /**
   * @ngdoc directive
   * @name thread
   * @restrict A
   * @description
   * Directive that instantiates {@link thread.ThreadController ThreadController}.
   *
   * If the `thread-collapsed` attribute is specified, it is treated as an
   * expression to watch in the context of the current scope that controls
   * the collapsed state of the thread.
   */

  thread = [
    '$parse', '$window', 'render', function($parse, $window, render) {
      var linkFn;
      linkFn = function(scope, elem, attrs, _arg) {
        var counter, ctrl;
        ctrl = _arg[0], counter = _arg[1];
        elem.on('click', function(event) {
          var sel, _ref;
          event.stopPropagation();
          if (angular.element(event.target).scope() === void 0) {
            return;
          }
          sel = $window.getSelection();
          if ((typeof sel.containsNode === "function" ? sel.containsNode(event.target, true) : void 0) && sel.toString().length) {
            return;
          }
          if ((_ref = event.target.tagName) === 'A' || _ref === 'INPUT') {
            if (!angular.element(event.target).hasClass('reply-count')) {
              return;
            }
          }
          if ((counter != null ? counter.count('edit') : void 0) > 0 && !ctrl.collapsed) {
            return;
          }
          return scope.$evalAsync(function() {
            return ctrl.toggleCollapsed();
          });
        });
        render(function() {
          ctrl.container = $parse(attrs.thread)(scope);
          counter.count('message', 1);
          return scope.$digest();
        });
        scope.$on('$destroy', function() {
          return counter.count('message', -1);
        });
        scope.$watch((function() {
          return ctrl.collapsed;
        }), function(collapsed) {
          if (collapsed) {
            return attrs.$addClass(COLLAPSED_CLASS);
          } else {
            return attrs.$removeClass(COLLAPSED_CLASS);
          }
        });
        if (attrs.threadCollapsed) {
          return scope.$watch($parse(attrs.threadCollapsed), function(collapsed) {
            if (!!collapsed !== ctrl.collapsed) {
              return ctrl.toggleCollapsed();
            }
          });
        }
      };
      return {
        controller: 'ThreadController',
        controllerAs: 'vm',
        link: linkFn,
        require: ['thread', '?^deepCount'],
        scope: true
      };
    }
  ];

  angular.module('h').controller('ThreadController', ThreadController).directive('thread', thread);


  /* global -extractURIComponent, -validate */

  extractURIComponent = function(uri, component) {
    if (!extractURIComponent.a) {
      extractURIComponent.a = document.createElement('a');
    }
    extractURIComponent.a.href = uri;
    return extractURIComponent.a[component];
  };

  validate = function(value) {
    var worldReadable, _ref, _ref1, _ref2, _ref3;
    if (!angular.isObject(value)) {
      return;
    }
    worldReadable = __indexOf.call(((_ref = value.permissions) != null ? _ref.read : void 0) || [], 'group:__world__') >= 0;
    return (((_ref1 = value.tags) != null ? _ref1.length : void 0) || ((_ref2 = value.text) != null ? _ref2.length : void 0)) || (((_ref3 = value.target) != null ? _ref3.length : void 0) && !worldReadable);
  };


  /**
   * @ngdoc type
   * @name annotation.AnnotationController
   *
   * @property {Object} annotation The annotation view model.
   * @property {Object} document The document metadata view model.
   * @property {string} action One of 'view', 'edit', 'create' or 'delete'.
   * @property {string} preview If previewing an edit then 'yes', else 'no'.
   * @property {boolean} editing True if editing components are shown.
   * @property {boolean} embedded True if the annotation is an embedded widget.
   *
   * @description
   *
   * `AnnotationController` provides an API for the annotation directive. It
   * manages the interaction between the domain and view models and uses the
   * {@link annotator annotator service} for persistence.
   */

  AnnotationController = [
    '$scope', 'annotator', 'drafts', 'flash', 'documentHelpers', function($scope, annotator, drafts, flash, documentHelpers) {
      var highlight, model, original, vm;
      this.annotation = {};
      this.action = 'view';
      this.document = null;
      this.preview = 'no';
      this.editing = false;
      this.embedded = false;
      highlight = annotator.tool === 'highlight';
      model = $scope.annotationGet();
      original = null;
      vm = this;

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#isComment.
       * @returns {boolean} True if the annotation is a comment.
       */
      this.isComment = function() {
        var _ref, _ref1;
        return !(((_ref = model.target) != null ? _ref.length : void 0) || ((_ref1 = model.references) != null ? _ref1.length : void 0));
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#isHighlight.
       * @returns {boolean} True if the annotation is a highlight.
       */
      this.isHighlight = function() {
        var _ref, _ref1, _ref2;
        return ((_ref = model.target) != null ? _ref.length : void 0) && !((_ref1 = model.references) != null ? _ref1.length : void 0) && !(model.text || model.deleted || ((_ref2 = model.tags) != null ? _ref2.length : void 0));
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#isPrivate
       * @returns {boolean} True if the annotation is private to the current user.
       */
      this.isPrivate = function() {
        var _ref;
        return model.user && angular.equals(((_ref = model.permissions) != null ? _ref.read : void 0) || [], [model.user]);
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#authorize
       * @param {string} action The action to authorize.
       * @returns {boolean} True if the action is authorized for the current user.
       * @description Checks whether the current user can perform an action on
       * the annotation.
       */
      this.authorize = function(action) {
        var _ref;
        if (model == null) {
          return false;
        }
        return (_ref = annotator.plugins.Permissions) != null ? _ref.authorize(action, model) : void 0;
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#delete
       * @description Deletes the annotation.
       */
      this["delete"] = function() {
        if (confirm("Are you sure you want to delete this annotation?")) {
          return annotator.deleteAnnotation(model);
        }
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#edit
       * @description Switches the view to an editor.
       */
      this.edit = function() {
        drafts.add(model, (function(_this) {
          return function() {
            return _this.revert();
          };
        })(this));
        this.action = model.id != null ? 'edit' : 'create';
        this.editing = true;
        return this.preview = 'no';
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#view
       * @description Reverts an edit in progress and returns to the viewer.
       */
      this.revert = function() {
        drafts.remove(model);
        if (this.action === 'create') {
          return annotator.publish('annotationDeleted', model);
        } else {
          this.render();
          this.action = 'view';
          return this.editing = false;
        }
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#save
       * @description Saves any edits and returns to the viewer.
       */
      this.save = function() {
        var tag;
        if (!(model.user || model.deleted)) {
          return flash('info', 'Please sign in to save your annotations.');
        }
        if (!validate(this.annotation)) {
          return flash('info', 'Please add text or a tag before publishing.');
        }
        angular.extend(model, this.annotation, {
          tags: (function() {
            var _i, _len, _ref, _results;
            _ref = this.annotation.tags;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              tag = _ref[_i];
              _results.push(tag.text);
            }
            return _results;
          }).call(this)
        });
        switch (this.action) {
          case 'create':
            annotator.publish('annotationCreated', model);
            break;
          case 'delete':
          case 'edit':
            annotator.publish('annotationUpdated', model);
        }
        this.editing = false;
        return this.action = 'view';
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#reply
       * @description
       * Creates a new message in reply to this annotation.
       */
      this.reply = function() {
        var id, references, reply, uri;
        id = model.id, references = model.references, uri = model.uri;
        references = references || [];
        if (typeof references === 'string') {
          references = [references];
        }
        references = __slice.call(references).concat([id]);
        reply = {
          references: references,
          uri: uri
        };
        annotator.publish('beforeAnnotationCreated', reply);
        if (__indexOf.call(model.permissions.read || [], 'group:__world__') >= 0) {
          return reply.permissions.read.push('group:__world__');
        }
      };

      /**
       * @ngdoc method
       * @name annotation.AnnotationController#render
       * @description Called to update the view when the model changes.
       */
      this.render = function() {
        var documentTitle, domain, link, text, uri, _i, _len, _ref;
        angular.extend(this.annotation, angular.copy(model));
        if (model.document) {
          uri = model.uri;
          if (uri.indexOf("urn") === 0) {
            _ref = model.document.link;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              link = _ref[_i];
              if (!(link.href.indexOf("urn"))) {
                continue;
              }
              uri = link.href;
              break;
            }
          }
          domain = extractURIComponent(uri, 'hostname');
          documentTitle = Array.isArray(model.document.title) ? model.document.title[0] : model.document.title;
          this.document = {
            uri: uri,
            domain: domain,
            title: documentTitle || domain
          };
          if (this.document.title.length > 30) {
            this.document.title = this.document.title.slice(0, 30) + '…';
          }
        } else {
          this.document = null;
        }
        return this.annotation.tags = (function() {
          var _j, _len1, _ref1, _results;
          _ref1 = model.tags || [];
          _results = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            text = _ref1[_j];
            _results.push({
              text: text
            });
          }
          return _results;
        })();
      };
      this.baseURI = documentHelpers.baseURI;
      $scope.$on('$destroy', function() {
        return drafts.remove(model);
      });
      $scope.$watch((function() {
        return model.updated;
      }), (function(_this) {
        return function(updated) {
          if (updated) {
            drafts.remove(model);
          }
          return _this.render();
        };
      })(this));
      $scope.$watch((function() {
        return model.user;
      }), (function(_this) {
        return function(user) {
          if (highlight && _this.isHighlight()) {
            if (user) {
              return annotator.publish('annotationCreated', model);
            } else {
              return drafts.add(model, function() {
                return _this.revert();
              });
            }
          } else {
            return _this.render();
          }
        };
      })(this));
      $scope.$watch(((function(_this) {
        return function() {
          return _this.annotation.id;
        };
      })(this)), (function(_this) {
        return function() {
          return vm.annotationURI = documentHelpers.absoluteURI("/a/" + _this.annotation.id);
        };
      })(this));
      if (!((model.id != null) || (highlight && this.isHighlight()))) {
        this.edit();
      }
      return this;
    }
  ];


  /**
   * @ngdoc directive
   * @name annotation
   * @restrict A
   * @description
   * Directive that instantiates
   * {@link annotation.AnnotationController AnnotationController}.
   *
   * If the `annotation-embbedded` attribute is specified, its interpolated
   * value is used to signal whether the annotation is being displayed inside
   * an embedded widget.
   */

  annotation = [
    'annotator', 'documentHelpers', function(annotator, documentHelpers) {
      var linkFn;
      linkFn = function(scope, elem, attrs, _arg) {
        var counter, ctrl, prune, thread, threadFilter;
        ctrl = _arg[0], thread = _arg[1], threadFilter = _arg[2], counter = _arg[3];
        prune = function(message) {
          var _ref;
          if (message.id != null) {
            return;
          }
          if (thread.container.message !== message) {
            return;
          }
          return (_ref = thread.container.parent) != null ? _ref.removeChild(thread.container) : void 0;
        };
        if (thread != null) {
          annotator.subscribe('annotationDeleted', prune);
          scope.$on('$destroy', function() {
            return annotator.unsubscribe('annotationDeleted', prune);
          });
        }
        attrs.$observe('annotationEmbedded', function(value) {
          return ctrl.embedded = (value != null) && value !== 'false';
        });
        elem.on('keydown', function(event) {
          if (event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            return scope.$evalAsync(function() {
              return ctrl.save();
            });
          }
        });
        if (counter != null) {
          scope.$watch((function() {
            return counter.count('edit');
          }), function(count) {
            if (count && !ctrl.editing && thread.collapsed) {
              return thread.toggleCollapsed();
            }
          });
          scope.$watch((function() {
            return ctrl.editing;
          }), function(editing, old) {
            if (editing) {
              counter.count('edit', 1);
              return threadFilter != null ? threadFilter.freeze() : void 0;
            } else if (old) {
              counter.count('edit', -1);
              return threadFilter != null ? threadFilter.freeze(false) : void 0;
            }
          });
          return scope.$on('$destroy', function() {
            if (ctrl.editing) {
              return counter != null ? counter.count('edit', -1) : void 0;
            }
          });
        }
      };
      return {
        controller: 'AnnotationController',
        controllerAs: 'vm',
        link: linkFn,
        require: ['annotation', '?^thread', '?^threadFilter', '?^deepCount'],
        scope: {
          annotationGet: '&annotation'
        },
        templateUrl: 'annotation.html'
      };
    }
  ];

  angular.module('h').controller('AnnotationController', AnnotationController).directive('annotation', annotation);


  /**
   * @ngdoc type
   * @name deepCount.DeepCountController
   *
   * @description
   * `DeepCountController` exports a single getter / setter that can be used
   * to retrieve and manipulate a set of counters. Changes to these counters
   * are bubbled and aggregated by any instances higher up in the DOM. Digests
   * are performed from the top down, scheduled during animation frames, and
   * debounced for performance.
   */

  DeepCountController = [
    '$element', '$scope', 'render', function($element, $scope, render) {
      var cancelFrame, counters, parent;
      cancelFrame = null;
      counters = {};
      parent = $element.parent().controller('deepCount');

      /**
       * @ngdoc method
       * @name deepCount.DeepCountController#count
       *
       * @param {string} key An aggregate key.
       * @param {number} delta If provided, the amount by which the aggregate
       * for the given key should be incremented.
       * @return {number} The value of the aggregate for the given key.
       *
       * @description
       * Modify an aggregate when called with an argument and return its current
       * value.
       */
      this.count = function(key, delta) {
        if (delta === void 0 || delta === 0) {
          return counters[key] || 0;
        }
        if (counters[key] == null) {
          counters[key] = 0;
        }
        counters[key] += delta;
        if (!counters[key]) {
          delete counters[key];
        }
        if (parent) {
          parent.count(key, delta);
        } else {
          if (cancelFrame) {
            cancelFrame();
          }
          cancelFrame = render(function() {
            $scope.$digest();
            return cancelFrame = null;
          });
        }
        return counters[key] || 0;
      };
      return this;
    }
  ];


  /**
   * @ngdoc directive
   * @name deepCount
   * @restrict A
   * @description
   * Directive that instantiates
   * {@link deepCount.DeepCountController DeepCountController} and exports it
   * to the current scope under the name specified by the attribute parameter.
   */

  deepCount = [
    '$parse', function($parse) {
      return {
        controller: 'DeepCountController',
        link: function(scope, elem, attrs, ctrl) {
          var parsedCounterName;
          parsedCounterName = $parse(attrs.deepCount);
          if (parsedCounterName.assign) {
            return parsedCounterName.assign(scope, angular.bind(ctrl, ctrl.count));
          }
        }
      };
    }
  ];

  angular.module('h').controller('DeepCountController', DeepCountController).directive('deepCount', deepCount);

  Converter = (function(_super) {
    __extends(Converter, _super);

    function Converter() {
      Converter.__super__.constructor.apply(this, arguments);
      this.hooks.chain("preConversion", function(text) {
        if (text) {
          return text;
        } else {
          return "";
        }
      });
      this.hooks.chain("postConversion", function(text) {
        return text.replace(/<a href=/g, "<a target=\"_blank\" href=");
      });
    }

    return Converter;

  })(Markdown.Converter);

  fuzzyTime = function(date) {
    var day, delta, fuzzy, hour, minute, month, week, year;
    if (!date) {
      return '';
    }
    delta = Math.round((+(new Date) - new Date(date)) / 1000);
    minute = 60;
    hour = minute * 60;
    day = hour * 24;
    week = day * 7;
    month = day * 30;
    year = day * 365;
    if (delta < 30) {
      fuzzy = 'moments ago';
    } else if (delta < minute) {
      fuzzy = delta + ' seconds ago';
    } else if (delta < 2 * minute) {
      fuzzy = 'a minute ago';
    } else if (delta < hour) {
      fuzzy = Math.floor(delta / minute) + ' minutes ago';
    } else if (Math.floor(delta / hour) === 1) {
      fuzzy = '1 hour ago';
    } else if (delta < day) {
      fuzzy = Math.floor(delta / hour) + ' hours ago';
    } else if (delta < day * 2) {
      fuzzy = 'yesterday';
    } else if (delta < month) {
      fuzzy = Math.round(delta / day) + ' days ago';
    } else if (delta < year) {
      fuzzy = Math.round(delta / month) + ' months ago';
    } else {
      fuzzy = Math.round(delta / year) + ' years ago';
    }
    return fuzzy;
  };

  momentFilter = function() {
    return function(value, format) {
      var error, momentDate, timezone, userLang;
      timezone = jstz.determine().name();
      userLang = navigator.language || navigator.userLanguage;
      momentDate = moment(value);
      momentDate.lang(userLang);
      try {
        return momentDate.tz(timezone).format('LLLL');
      } catch (_error) {
        error = _error;
        return momentDate.format('LLLL');
      }
    };
  };

  persona = function(user, part) {
    var _ref;
    if (part == null) {
      part = 'username';
    }
    part = ['term', 'username', 'provider'].indexOf(part);
    return (_ref = user != null ? user.match(/^acct:([^@]+)@(.+)/) : void 0) != null ? _ref[part] : void 0;
  };

  angular.module('h').filter('converter', function() {
    return (new Converter()).makeHtml;
  }).filter('fuzzyTime', function() {
    return fuzzyTime;
  }).filter('moment', momentFilter).filter('persona', function() {
    return persona;
  });

  SearchFilter = (function() {
    function SearchFilter() {}

    SearchFilter.prototype._tokenize = function(searchtext) {
      var filter, index, token, tokenPart, tokens, _i, _len, _removeQuoteCharacter;
      if (!searchtext) {
        return [];
      }
      _removeQuoteCharacter = function(text) {
        var end, start;
        start = text.slice(0, 1);
        end = text.slice(-1);
        if ((start === '"' || start === "'") && (start === end)) {
          text = text.slice(1, text.length - 1);
        }
        return text;
      };
      tokens = searchtext.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
      tokens = tokens.map(_removeQuoteCharacter);
      for (index = _i = 0, _len = tokens.length; _i < _len; index = ++_i) {
        token = tokens[index];
        filter = token.slice(0, token.indexOf(":"));
        if (filter == null) {
          filter = "";
        }
        if (filter === 'quote' || filter === 'result' || filter === 'since' || filter === 'tag' || filter === 'text' || filter === 'uri' || filter === 'user') {
          tokenPart = token.slice(filter.length + 1);
          tokens[index] = filter + ':' + (_removeQuoteCharacter(tokenPart));
        }
      }
      return tokens;
    };

    SearchFilter.prototype.generateFacetedFilter = function(searchtext) {
      var any, filter, quote, result, since, t, tag, term, terms, text, time, uri, user, _i, _len;
      any = [];
      quote = [];
      result = [];
      since = [];
      tag = [];
      text = [];
      uri = [];
      user = [];
      if (searchtext) {
        terms = this._tokenize(searchtext);
        for (_i = 0, _len = terms.length; _i < _len; _i++) {
          term = terms[_i];
          filter = term.slice(0, term.indexOf(":"));
          if (filter == null) {
            filter = "";
          }
          switch (filter) {
            case 'quote':
              quote.push(term.slice(6).toLowerCase());
              break;
            case 'result':
              result.push(term.slice(7));
              break;
            case 'since':
              time = term.slice(6).toLowerCase();
              if (time.match(/^\d+$/)) {
                since.push(time);
              }
              if (time.match(/^\d+sec$/)) {
                t = /^(\d+)sec$/.exec(time)[1];
                since.push(t);
              }
              if (time.match(/^\d+min$/)) {
                t = /^(\d+)min$/.exec(time)[1];
                since.push(t * 60);
              }
              if (time.match(/^\d+hour$/)) {
                t = /^(\d+)hour$/.exec(time)[1];
                since.push(t * 60 * 60);
              }
              if (time.match(/^\d+day$/)) {
                t = /^(\d+)day$/.exec(time)[1];
                since.push(t * 60 * 60 * 24);
              }
              if (time.match(/^\d+week$/)) {
                t = /^(\d+)week$/.exec(time)[1];
                since.push(t * 60 * 60 * 24 * 7);
              }
              if (time.match(/^\d+month$/)) {
                t = /^(\d+)month$/.exec(time)[1];
                since.push(t * 60 * 60 * 24 * 30);
              }
              if (time.match(/^\d+year$/)) {
                t = /^(\d+)year$/.exec(time)[1];
                since.push(t * 60 * 60 * 24 * 365);
              }
              break;
            case 'tag':
              tag.push(term.slice(4).toLowerCase());
              break;
            case 'text':
              text.push(term.slice(5).toLowerCase());
              break;
            case 'uri':
              uri.push(term.slice(4).toLowerCase());
              break;
            case 'user':
              user.push(term.slice(5).toLowerCase());
              break;
            default:
              any.push(term.toLowerCase());
          }
        }
      }
      return {
        any: {
          terms: any,
          operator: 'and'
        },
        quote: {
          terms: quote,
          operator: 'and'
        },
        result: {
          terms: result,
          operator: 'min'
        },
        since: {
          terms: since,
          operator: 'and'
        },
        tag: {
          terms: tag,
          operator: 'and'
        },
        text: {
          terms: text,
          operator: 'and'
        },
        uri: {
          terms: uri,
          operator: 'or'
        },
        user: {
          terms: user,
          operator: 'or'
        }
      };
    };

    return SearchFilter;

  })();

  QueryParser = (function() {
    function QueryParser() {
      this.populateFilter = __bind(this.populateFilter, this);
    }

    QueryParser.prototype.rules = {
      user: {
        path: '/user',
        case_sensitive: false,
        and_or: 'or'
      },
      text: {
        path: '/text',
        case_sensitive: false,
        and_or: 'and'
      },
      tag: {
        path: '/tags',
        case_sensitive: false,
        and_or: 'and'
      },
      quote: {
        path: '/quote',
        case_sensitive: false,
        and_or: 'and'
      },
      uri: {
        formatter: function(uri) {
          return uri.toLowerCase();
        },
        path: '/uri',
        case_sensitive: false,
        and_or: 'or',
        options: {
          es: {
            query_type: 'match',
            cutoff_frequency: 0.001,
            and_or: 'and'
          }
        }
      },
      since: {
        formatter: function(past) {
          var seconds;
          seconds = (function() {
            switch (past) {
              case '5 min':
                return 5 * 60;
              case '30 min':
                return 30 * 60;
              case '1 hour':
                return 60 * 60;
              case '12 hours':
                return 12 * 60 * 60;
              case '1 day':
                return 24 * 60 * 60;
              case '1 week':
                return 7 * 24 * 60 * 60;
              case '1 month':
                return 30 * 24 * 60 * 60;
              case '1 year':
                return 365 * 24 * 60 * 60;
            }
          })();
          return new Date(new Date().valueOf() - seconds * 1000);
        },
        path: '/created',
        case_sensitive: true,
        and_or: 'and',
        operator: 'ge'
      },
      any: {
        case_sensitive: false,
        and_or: 'and',
        path: ['/quote', '/tags', '/text', '/uri', '/user'],
        options: {
          es: {
            query_type: 'multi_match',
            match_type: 'cross_fields',
            and_or: 'and',
            fields: ['quote', 'tag', 'text', 'uri', 'user']
          }
        }
      }
    };

    QueryParser.prototype.populateFilter = function(filter, query) {
      var and_or, case_sensitive, category, mapped_field, oper_part, rule, t, term, terms, val, value, value_part, _i, _len, _results;
      _results = [];
      for (category in query) {
        value = query[category];
        if (this.rules[category] == null) {
          continue;
        }
        terms = value.terms;
        if (!terms.length) {
          continue;
        }
        rule = this.rules[category];
        case_sensitive = rule.case_sensitive != null ? rule.case_sensitive : false;
        and_or = rule.and_or != null ? rule.and_or : 'or';
        mapped_field = rule.path != null ? rule.path : '/' + category;
        if (and_or === 'or') {
          oper_part = rule.operator != null ? rule.operator : 'match_of';
          value_part = [];
          for (_i = 0, _len = terms.length; _i < _len; _i++) {
            term = terms[_i];
            t = rule.formatter ? rule.formatter(term) : term;
            value_part.push(t);
          }
          _results.push(filter.addClause(mapped_field, oper_part, value_part, case_sensitive, rule.options));
        } else {
          oper_part = rule.operator != null ? rule.operator : 'matches';
          _results.push((function() {
            var _j, _len1, _results1;
            _results1 = [];
            for (_j = 0, _len1 = terms.length; _j < _len1; _j++) {
              val = terms[_j];
              value_part = rule.formatter ? rule.formatter(val) : val;
              _results1.push(filter.addClause(mapped_field, oper_part, value_part, case_sensitive, rule.options));
            }
            return _results1;
          })());
        }
      }
      return _results;
    };

    return QueryParser;

  })();

  StreamFilter = (function() {
    StreamFilter.prototype.strategies = ['include_any', 'include_all', 'exclude_any', 'exclude_all'];

    StreamFilter.prototype.past_modes = ['none', 'hits', 'time'];

    StreamFilter.prototype.filter = {
      match_policy: 'include_any',
      clauses: [],
      actions: {
        create: true,
        update: true,
        "delete": true
      },
      past_data: {
        load_past: "none"
      }
    };

    function StreamFilter() {}

    StreamFilter.prototype.getFilter = function() {
      return this.filter;
    };

    StreamFilter.prototype.getPastData = function() {
      return this.filter.past_data;
    };

    StreamFilter.prototype.getMatchPolicy = function() {
      return this.filter.match_policy;
    };

    StreamFilter.prototype.getClauses = function() {
      return this.filter.clauses;
    };

    StreamFilter.prototype.getActions = function() {
      return this.filter.actions;
    };

    StreamFilter.prototype.getActionCreate = function() {
      return this.filter.actions.create;
    };

    StreamFilter.prototype.getActionUpdate = function() {
      return this.filter.actions.update;
    };

    StreamFilter.prototype.getActionDelete = function() {
      return this.filter.actions["delete"];
    };

    StreamFilter.prototype.setPastDataNone = function() {
      this.filter.past_data = {
        load_past: 'none'
      };
      return this;
    };

    StreamFilter.prototype.setPastDataHits = function(hits) {
      this.filter.past_data = {
        load_past: 'hits',
        hits: hits
      };
      return this;
    };

    StreamFilter.prototype.setPastDataTime = function(time) {
      this.filter.past_data = {
        load_past: 'hits',
        go_back: time
      };
      return this;
    };

    StreamFilter.prototype.setMatchPolicy = function(policy) {
      this.filter.match_policy = policy;
      return this;
    };

    StreamFilter.prototype.setMatchPolicyIncludeAny = function() {
      this.filter.match_policy = 'include_any';
      return this;
    };

    StreamFilter.prototype.setMatchPolicyIncludeAll = function() {
      this.filter.match_policy = 'include_all';
      return this;
    };

    StreamFilter.prototype.setMatchPolicyExcludeAny = function() {
      this.filter.match_policy = 'exclude_any';
      return this;
    };

    StreamFilter.prototype.setMatchPolicyExcludeAll = function() {
      this.filter.match_policy = 'exclude_all';
      return this;
    };

    StreamFilter.prototype.setActions = function(actions) {
      this.filter.actions = actions;
      return this;
    };

    StreamFilter.prototype.setActionCreate = function(action) {
      this.filter.actions.create = action;
      return this;
    };

    StreamFilter.prototype.setActionUpdate = function(action) {
      this.filter.actions.update = action;
      return this;
    };

    StreamFilter.prototype.setActionDelete = function(action) {
      this.filter.actions["delete"] = action;
      return this;
    };

    StreamFilter.prototype.noClauses = function() {
      this.filter.clauses = [];
      return this;
    };

    StreamFilter.prototype.addClause = function(field, operator, value, case_sensitive, options) {
      if (case_sensitive == null) {
        case_sensitive = false;
      }
      if (options == null) {
        options = {};
      }
      this.filter.clauses.push({
        field: field,
        operator: operator,
        value: value,
        case_sensitive: case_sensitive,
        options: options
      });
      return this;
    };

    StreamFilter.prototype.resetFilter = function() {
      this.setMatchPolicyIncludeAny();
      this.setActionCreate(true);
      this.setActionUpdate(true);
      this.setActionDelete(true);
      this.setPastDataNone();
      this.noClauses();
      return this;
    };

    return StreamFilter;

  })();

  angular.module('h').service('searchfilter', SearchFilter).service('queryparser', QueryParser).service('streamfilter', StreamFilter);


  /**
   * @ngdoc service
   * @name render
   * @param {function()} fn A function to execute in a future animation frame.
   * @returns {function()} A function to cancel the execution.
   * @description
   * The render service is a wrapper around `window#requestAnimationFrame()` for
   * scheduling sequential updates in successive animation frames. It has the
   * same signature as the original function, but will queue successive calls
   * for future frames so that at most one callback is handled per animation frame.
   * Use this service to schedule DOM-intensive digests.
   */

  renderFactory = [
    '$$rAF', function($$rAF) {
      var cancel, queue, render;
      cancel = null;
      queue = [];
      render = function() {
        if (queue.length === 0) {
          return cancel = null;
        }
        queue.shift()();
        return $$rAF(render);
      };
      return function(fn) {
        queue.push(fn);
        if (!cancel) {
          cancel = $$rAF(render);
        }
        return function() {
          var f;
          return queue = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = queue.length; _i < _len; _i++) {
              f = queue[_i];
              if (f !== fn) {
                _results.push(f);
              }
            }
            return _results;
          })();
        };
      };
    }
  ];

  Hypothesis = (function(_super) {
    __extends(Hypothesis, _super);

    Hypothesis.prototype.events = {
      'beforeAnnotationCreated': 'digest',
      'annotationCreated': 'digest',
      'annotationDeleted': 'annotationDeleted',
      'annotationUpdated': 'digest',
      'annotationsLoaded': 'digest'
    };

    Hypothesis.prototype.options = {
      noDocAccess: true,
      Discovery: {},
      Threading: {}
    };

    Hypothesis.prototype.providers = null;

    Hypothesis.prototype.host = null;

    Hypothesis.prototype.tool = 'comment';

    Hypothesis.prototype.visibleHighlights = false;

    Hypothesis.prototype.editor = {
      addField: angular.noop
    };

    Hypothesis.prototype.viewer = {
      addField: angular.noop
    };

    Hypothesis.$inject = ['$document', '$window'];

    function Hypothesis($document, $window) {
      var name, opts, whitelist, _ref;
      Hypothesis.__super__.constructor.call(this, $document.find('body'));
      window.annotator = this;
      this.providers = [];
      this.socialView = {
        name: "none"
      };
      this.patch_store();
      _ref = this.options;
      for (name in _ref) {
        if (!__hasProp.call(_ref, name)) continue;
        opts = _ref[name];
        if (!this.plugins[name] && name in Annotator.Plugin) {
          this.addPlugin(name, opts);
        }
      }
      whitelist = ['target', 'document', 'uri'];
      this.addPlugin('Bridge', {
        gateway: true,
        formatter: (function(_this) {
          return function(annotation) {
            var formatted, k, v;
            formatted = {};
            for (k in annotation) {
              v = annotation[k];
              if (__indexOf.call(whitelist, k) >= 0) {
                formatted[k] = v;
              }
            }
            return formatted;
          };
        })(this),
        parser: (function(_this) {
          return function(annotation) {
            var k, parsed, v;
            parsed = {};
            for (k in annotation) {
              v = annotation[k];
              if (__indexOf.call(whitelist, k) >= 0) {
                parsed[k] = v;
              }
            }
            return parsed;
          };
        })(this),
        onConnect: (function(_this) {
          return function(source, origin, scope) {
            var channel, entities, options;
            options = {
              window: source,
              origin: origin,
              scope: "" + scope + ":provider",
              onReady: function() {
                if (source === $window.parent) {
                  return _this.host = channel;
                }
              }
            };
            entities = [];
            channel = _this._setupXDM(options);
            channel.call({
              method: 'getDocumentInfo',
              success: function(info) {
                var entityUris, href, link, _i, _len, _ref1, _ref2;
                entityUris = {};
                entityUris[info.uri] = true;
                _ref1 = info.metadata.link;
                for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                  link = _ref1[_i];
                  if (link.href) {
                    entityUris[link.href] = true;
                  }
                }
                for (href in entityUris) {
                  entities.push(href);
                }
                return (_ref2 = _this.plugins.Store) != null ? _ref2.loadAnnotations() : void 0;
              }
            });
            channel.notify({
              method: 'setTool',
              params: _this.tool
            });
            channel.notify({
              method: 'setVisibleHighlights',
              params: _this.visibleHighlights
            });
            return _this.providers.push({
              channel: channel,
              entities: entities
            });
          };
        })(this)
      });
    }

    Hypothesis.prototype._setupXDM = function(options) {
      var provider;
      if ((options.origin.match(/^chrome-extension:\/\//)) || (options.origin.match(/^resource:\/\//))) {
        options.origin = '*';
      }
      provider = Channel.build(options);
      return provider.bind('publish', (function(_this) {
        return function() {
          var args, ctx;
          ctx = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          return _this.publish.apply(_this, args);
        };
      })(this)).bind('back', (function(_this) {
        return function() {
          return _this.element.scope().$apply(function() {
            return _this.hide();
          });
        };
      })(this)).bind('open', (function(_this) {
        return function() {
          return _this.element.scope().$apply(function() {
            return _this.show();
          });
        };
      })(this)).bind('showEditor', (function(_this) {
        return function(ctx, tag) {
          return _this.element.scope().$apply(function() {
            return _this.showEditor(_this._getLocalAnnotation(tag));
          });
        };
      })(this)).bind('showViewer', (function(_this) {
        return function(ctx, tags) {
          if (tags == null) {
            tags = [];
          }
          return _this.element.scope().$apply(function() {
            return _this.showViewer(_this._getLocalAnnotations(tags));
          });
        };
      })(this)).bind('updateViewer', (function(_this) {
        return function(ctx, tags) {
          if (tags == null) {
            tags = [];
          }
          return _this.element.scope().$apply(function() {
            return _this.updateViewer(_this._getLocalAnnotations(tags));
          });
        };
      })(this)).bind('toggleViewerSelection', (function(_this) {
        return function(ctx, tags) {
          if (tags == null) {
            tags = [];
          }
          return _this.element.scope().$apply(function() {
            return _this.toggleViewerSelection(_this._getLocalAnnotations(tags));
          });
        };
      })(this)).bind('setTool', (function(_this) {
        return function(ctx, name) {
          return _this.element.scope().$apply(function() {
            return _this.setTool(name);
          });
        };
      })(this)).bind('setVisibleHighlights', (function(_this) {
        return function(ctx, state) {
          return _this.element.scope().$apply(function() {
            return _this.setVisibleHighlights(state);
          });
        };
      })(this));
    };

    Hypothesis.prototype._getLocalAnnotation = function(tag) {
      return this.plugins.Bridge.cache[tag];
    };

    Hypothesis.prototype._getLocalAnnotations = function(tags) {
      var t, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = tags.length; _i < _len; _i++) {
        t = tags[_i];
        _results.push(this._getLocalAnnotation(t));
      }
      return _results;
    };

    Hypothesis.prototype._setupWrapper = function() {
      this.wrapper = this.element.find('#wrapper');
      return this;
    };

    Hypothesis.prototype._setupDocumentEvents = function() {
      document.addEventListener('dragover', (function(_this) {
        return function(event) {
          var _ref;
          return (_ref = _this.host) != null ? _ref.notify({
            method: 'dragFrame',
            params: event.screenX
          }) : void 0;
        };
      })(this));
      return this;
    };

    Hypothesis.prototype._setupDynamicStyle = function() {
      return this;
    };

    Hypothesis.prototype._setupViewer = function() {
      return this;
    };

    Hypothesis.prototype._setupEditor = function() {
      return this;
    };

    Hypothesis.prototype._setupDocumentAccessStrategies = function() {
      return this;
    };

    Hypothesis.prototype._scan = function() {
      return this;
    };

    Hypothesis.prototype.setupAnnotation = function(annotation) {
      return annotation;
    };

    Hypothesis.prototype._setSelectedAnnotations = function(selected) {
      var count, scope;
      scope = this.element.scope();
      count = Object.keys(selected).length;
      scope.selectedAnnotationsCount = count;
      if (count) {
        return scope.selectedAnnotations = selected;
      } else {
        return scope.selectedAnnotations = null;
      }
    };

    Hypothesis.prototype.toggleViewerSelection = function(annotations) {
      var a, scope, selected, _i, _len;
      if (annotations == null) {
        annotations = [];
      }
      scope = this.element.scope();
      scope.search.query = '';
      selected = scope.selectedAnnotations || {};
      for (_i = 0, _len = annotations.length; _i < _len; _i++) {
        a = annotations[_i];
        if (selected[a.id]) {
          delete selected[a.id];
        } else {
          selected[a.id] = true;
        }
      }
      this._setSelectedAnnotations(selected);
      return this;
    };

    Hypothesis.prototype.updateViewer = function(annotations) {
      if (annotations == null) {
        annotations = [];
      }
      return this;
    };

    Hypothesis.prototype.showViewer = function(annotations) {
      var a, scope, selected, _i, _len;
      if (annotations == null) {
        annotations = [];
      }
      scope = this.element.scope();
      scope.search.query = '';
      selected = {};
      for (_i = 0, _len = annotations.length; _i < _len; _i++) {
        a = annotations[_i];
        selected[a.id] = true;
      }
      this._setSelectedAnnotations(selected);
      this.show();
      return this;
    };

    Hypothesis.prototype.showEditor = function(annotation) {
      delete this.element.scope().selectedAnnotations;
      this.show();
      return this;
    };

    Hypothesis.prototype.show = function() {
      return this.host.notify({
        method: 'showFrame'
      });
    };

    Hypothesis.prototype.hide = function() {
      return this.host.notify({
        method: 'hideFrame'
      });
    };

    Hypothesis.prototype.digest = function() {
      return this.element.scope().$evalAsync(angular.noop);
    };

    Hypothesis.prototype.annotationDeleted = function(annotation) {
      var scope, _ref;
      scope = this.element.scope();
      if ((_ref = scope.selectedAnnotations) != null ? _ref[annotation.id] : void 0) {
        delete scope.selectedAnnotations[annotation.id];
        this._setSelectedAnnotations(scope.selectedAnnotations);
      }
      return this.digest();
    };

    Hypothesis.prototype.patch_store = function() {
      var Store, scope;
      scope = this.element.scope();
      Store = Annotator.Plugin.Store;
      Store.prototype.loadAnnotations = function() {
        var entities, p, query, uri, _i, _j, _len, _len1, _ref, _ref1;
        query = {
          limit: 1000
        };
        this.annotator.considerSocialView.call(this.annotator, query);
        entities = {};
        _ref = this.annotator.providers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          p = _ref[_i];
          _ref1 = p.entities;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            uri = _ref1[_j];
            if (entities[uri] == null) {
              entities[uri] = true;
              this.loadAnnotationsFromSearch(angular.extend({}, query, {
                uri: uri
              }));
            }
          }
        }
        return this.entities = Object.keys(entities);
      };
      return Store.prototype.updateAnnotation = (function(_this) {
        return function(annotation, data) {
          var container, ref, references, update, _i, _len, _ref;
          annotation = angular.extend(annotation, data);
          update = function(parent) {
            var child, _i, _len, _ref;
            _ref = parent.children;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              child = _ref[_i];
              if (!(child.message === annotation)) {
                continue;
              }
              scope.threading.idTable[data.id] = child;
              return true;
            }
            return false;
          };
          references = annotation.references || [];
          if (typeof annotation.references === 'string') {
            references = [];
          }
          _ref = references.slice().reverse();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            ref = _ref[_i];
            container = scope.threading.idTable[ref];
            if (container == null) {
              continue;
            }
            if (update(container)) {
              break;
            }
          }
          return update(scope.threading.root);
        };
      })(this);
    };

    Hypothesis.prototype.considerSocialView = function(query) {
      var _ref;
      switch (this.socialView.name) {
        case "none":
          return delete query.user;
        case "single-player":
          if ((_ref = this.plugins.Permissions) != null ? _ref.user : void 0) {
            return query.user = this.plugins.Permissions.user;
          } else {
            return delete query.user;
          }
      }
    };

    Hypothesis.prototype.setTool = function(name) {
      var p, _i, _len, _ref, _results;
      if (name === this.tool) {
        return;
      }
      if (name === 'highlight') {
        this.socialView.name = 'single-player';
      } else {
        this.socialView.name = 'none';
      }
      this.tool = name;
      this.publish('setTool', name);
      _ref = this.providers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        _results.push(p.channel.notify({
          method: 'setTool',
          params: name
        }));
      }
      return _results;
    };

    Hypothesis.prototype.setVisibleHighlights = function(state) {
      var p, _i, _len, _ref, _results;
      if (state === this.visibleHighlights) {
        return;
      }
      this.visibleHighlights = state;
      this.publish('setVisibleHighlights', state);
      _ref = this.providers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        _results.push(p.channel.notify({
          method: 'setVisibleHighlights',
          params: state
        }));
      }
      return _results;
    };

    return Hypothesis;

  })(Annotator);

  DraftProvider = (function() {
    DraftProvider.prototype._drafts = null;

    function DraftProvider() {
      this._drafts = [];
    }

    DraftProvider.prototype.$get = function() {
      return this;
    };

    DraftProvider.prototype.all = function() {
      var draft, _i, _len, _ref, _results;
      _ref = this._drafts;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        draft = _ref[_i].draft;
        _results.push(draft);
      }
      return _results;
    };

    DraftProvider.prototype.add = function(draft, cb) {
      return this._drafts.push({
        draft: draft,
        cb: cb
      });
    };

    DraftProvider.prototype.remove = function(draft) {
      var d, i, remove, _i, _len, _ref, _results;
      remove = [];
      _ref = this._drafts;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        d = _ref[i];
        if (d.draft === draft) {
          remove.push(i);
        }
      }
      _results = [];
      while (remove.length) {
        _results.push(this._drafts.splice(remove.pop(), 1));
      }
      return _results;
    };

    DraftProvider.prototype.contains = function(draft) {
      var d, _i, _len, _ref;
      _ref = this._drafts;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        d = _ref[_i];
        if (d.draft === draft) {
          return true;
        }
      }
      return false;
    };

    DraftProvider.prototype.isEmpty = function() {
      return this._drafts.length === 0;
    };

    DraftProvider.prototype.discard = function() {
      var d, discarded, text, _i, _len;
      text = (function() {
        switch (this._drafts.length) {
          case 0:
            return null;
          case 1:
            return "You have an unsaved reply.\n\nDo you really want to discard this draft?";
          default:
            return "You have " + this._drafts.length + " unsaved replies.\n\nDo you really want to discard these drafts?";
        }
      }).call(this);
      if (this._drafts.length === 0 || confirm(text)) {
        discarded = this._drafts.slice();
        this._drafts = [];
        for (_i = 0, _len = discarded.length; _i < _len; _i++) {
          d = discarded[_i];
          if (typeof d.cb === "function") {
            d.cb();
          }
        }
        return true;
      } else {
        return false;
      }
    };

    return DraftProvider;

  })();

  ViewFilter = (function() {
    function ViewFilter() {}

    ViewFilter.prototype.checkers = {
      quote: {
        autofalse: function(annotation) {
          return annotation.references != null;
        },
        value: function(annotation) {
          var quotes, s, t, _ref;
          quotes = (function() {
            var _i, _len, _ref, _results;
            _ref = annotation.target || [];
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              t = _ref[_i];
              _results.push((function() {
                var _j, _len1, _ref1, _results1;
                _ref1 = t.selector || [];
                _results1 = [];
                for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                  s = _ref1[_j];
                  if (!(s.type === 'TextQuoteSelector')) {
                    continue;
                  }
                  if (!s.exact) {
                    continue;
                  }
                  _results1.push(s.exact);
                }
                return _results1;
              })());
            }
            return _results;
          })();
          quotes = (_ref = Array.prototype).concat.apply(_ref, quotes);
          return quotes.join('\n');
        },
        match: function(term, value) {
          return value.indexOf(term) > -1;
        }
      },
      since: {
        autofalse: function(annotation) {
          return annotation.updated == null;
        },
        value: function(annotation) {
          return annotation.updated;
        },
        match: function(term, value) {
          var delta;
          delta = Math.round((+(new Date) - new Date(value)) / 1000);
          return delta <= term;
        }
      },
      tag: {
        autofalse: function(annotation) {
          return annotation.tags == null;
        },
        value: function(annotation) {
          return annotation.tags;
        },
        match: function(term, value) {
          return __indexOf.call(term, value) >= 0;
        }
      },
      text: {
        autofalse: function(annotation) {
          return annotation.text == null;
        },
        value: function(annotation) {
          return annotation.text;
        },
        match: function(term, value) {
          return value.indexOf(term) > -1;
        }
      },
      uri: {
        autofalse: function(annotation) {
          return annotation.uri == null;
        },
        value: function(annotation) {
          return annotation.uri;
        },
        match: function(term, value) {
          return value === term;
        }
      },
      user: {
        autofalse: function(annotation) {
          return annotation.user == null;
        },
        value: function(annotation) {
          return annotation.user;
        },
        match: function(term, value) {
          return value.indexOf(term) > -1;
        }
      },
      any: {
        fields: ['quote', 'text', 'tag', 'user']
      }
    };

    ViewFilter.prototype._matches = function(filter, value, match) {
      var matches, term, _i, _len, _ref;
      matches = true;
      _ref = filter.terms;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        term = _ref[_i];
        if (!match(term, value)) {
          matches = false;
          if (filter.operator === 'and') {
            break;
          }
        } else {
          matches = true;
          if (filter.operator === 'or') {
            break;
          }
        }
      }
      return matches;
    };

    ViewFilter.prototype._arrayMatches = function(filter, value, match) {
      var copy, matches;
      matches = true;
      copy = value.slice();
      copy = copy.filter(function(e) {
        return match(filter.terms, e);
      });
      if ((filter.operator === 'and' && copy.length < filter.terms.length) || (filter.operator === 'or' && !copy.length)) {
        matches = false;
      }
      return matches;
    };

    ViewFilter.prototype._checkMatch = function(filter, annotation, checker) {
      var autofalsefn, value;
      autofalsefn = checker.autofalse;
      if ((autofalsefn != null) && autofalsefn(annotation)) {
        return false;
      }
      value = checker.value(annotation);
      if (angular.isArray(value)) {
        if (typeof value[0] === 'string') {
          value = value.map(function(v) {
            return v.toLowerCase();
          });
        }
        return this._arrayMatches(filter, value, checker.match);
      } else {
        if (typeof value === 'string') {
          value = value.toLowerCase();
        }
        return this._matches(filter, value, checker.match);
      }
    };

    ViewFilter.prototype.filter = function(annotations, filters) {
      var category, categoryMatch, count, field, filter, limit, results, _ref;
      limit = Math.min.apply(Math, ((_ref = filters.result) != null ? _ref.terms : void 0) || []);
      count = 0;
      return results = (function() {
        var _i, _j, _len, _len1, _ref1, _results;
        _results = [];
        for (_i = 0, _len = annotations.length; _i < _len; _i++) {
          annotation = annotations[_i];
          if (count >= limit) {
            break;
          }
          match = true;
          for (category in filters) {
            filter = filters[category];
            if (!match) {
              break;
            }
            if (!filter.terms.length) {
              continue;
            }
            switch (category) {
              case 'any':
                categoryMatch = false;
                _ref1 = this.checkers.any.fields;
                for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                  field = _ref1[_j];
                  if (this._checkMatch(filter, annotation, this.checkers[field])) {
                    categoryMatch = true;
                    break;
                  }
                }
                match = categoryMatch;
                break;
              default:
                match = this._checkMatch(filter, annotation, this.checkers[category]);
            }
          }
          if (!match) {
            continue;
          }
          count++;
          _results.push(annotation.id);
        }
        return _results;
      }).call(this);
    };

    return ViewFilter;

  })();

  angular.module('h').factory('render', renderFactory).provider('drafts', DraftProvider).service('annotator', Hypothesis).service('viewFilter', ViewFilter);

  clientID = function() {
    var buffer;
    buffer = new Array(16);
    uuid.v4(null, buffer, 0);
    return uuid.unparse(buffer);
  };

  run = [
    'clientID', function(clientID) {
      return $.ajaxSetup({
        headers: {
          "X-Client-Id": clientID
        }
      });
    }
  ];

  socket = [
    'documentHelpers', 'clientID', function(documentHelpers, clientID) {
      return function() {
        //return new Socket(clientID, "" + documentHelpers.baseURI + "__streamer__");
        //pywb PATCH
        return new Socket(clientID, "https://hypothes.is/__streamer__");
      };
    }
  ];

  Socket = (function(_super) {
    __extends(Socket, _super);

    function Socket() {
      var args, clientID, send;
      clientID = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      SockJS.apply(this, args);
      send = this.send;
      this.send = (function(_this) {
        return function(data) {
          var cid;
          cid = JSON.stringify({
            messageType: 'client_id',
            value: clientID
          });
          send.call(_this, cid);
          send.call(_this, data);
          return _this.send = send;
        };
      })(this);
    }

    return Socket;

  })(SockJS);

  angular.module('h').factory('clientID', clientID).factory('socket', socket).run(run);

  StreamSearchController = (function() {
    StreamSearchController.inject = ['$scope', '$rootScope', '$routeParams', 'annotator', 'queryparser', 'searchfilter', 'streamfilter'];

    function StreamSearchController($scope, $rootScope, $routeParams, annotator, queryparser, searchfilter, streamfilter) {
      var terms, _ref, _ref1;
      if ((_ref = annotator.plugins.Threading) != null) {
        _ref.pluginInit();
      }
      if ((_ref1 = annotator.plugins.Store) != null) {
        _ref1.annotations = [];
      }
      streamfilter.resetFilter().setMatchPolicyIncludeAll().setPastDataHits(50);
      $scope.search.query = $routeParams.q;
      terms = searchfilter.generateFacetedFilter($scope.search.query);
      queryparser.populateFilter(streamfilter, terms);
      $scope.isEmbedded = false;
      $scope.isStream = true;
      $scope.sort.name = 'Newest';
      $scope.shouldShowThread = function(container) {
        return true;
      };
      $scope.$watch('updater', function(updater) {
        return updater != null ? updater.then(function(sock) {
          var filter;
          filter = streamfilter.getFilter();
          return sock.send(JSON.stringify({
            filter: filter
          }));
        }) : void 0;
      });
      $scope.$on('$destroy', function() {
        return $scope.search.query = '';
      });
    }

    return StreamSearchController;

  })();

  angular.module('h').controller('StreamSearchController', StreamSearchController);


  /**
   * @ngdoc provider
   * @name identityProvider
  
   * @property {function} checkAuthentication A function to check for an
   * authenticated user. This function should return an authorization certificate,
   * or a promise of the same, if the user has authorized signing in to the
   * application. Its arguments are injected.
   *
   * @property {function} forgetAuthentication A function to forget the current
   * authentication. The return value, if any, will be resolved as a promise
   * before the identity service fires logout callbacks. This function should
   * ensure any active session is invalidated. Its arguments are injected.
   *
   * @property {function} requestAuthentication A function to request that the
   * the user begin authenticating. This function should start a flow that
   * authenticates the user before asking the user grant authorization to the
   * application and then returning an authorization certificate or a promise
   * of the same. Its arguments are injected.
   *
   * @description
   * The `identityProvider` is used to configure functions that fulfill
   * identity authorization state management requests. It allows applications
   * that perform authentication to export their authentication responding to
   * identity authorization requests from clients consuming the
   * {@link h.identity:identity identity} service.
   *
   * An application wishing to export an identity provider should override all
   * of the public methods of this provider.
   */

  identityProvider = function() {
    return {
      checkAuthentication: [
        '$q', function($q) {
          return $q.reject('Not implemented idenityProvider#checkAuthentication.');
        }
      ],
      forgetAuthentication: [
        '$q', function($q) {
          return $q.reject('Not implemented idenityProvider#forgetAuthentication.');
        }
      ],
      requestAuthentication: [
        '$q', function($q) {
          return $q.reject('Not implemented idenityProvider#requestAuthentication.');
        }
      ],

      /**
       * @ngdoc service
       * @name identity
       * @description
       * This service is used by a client application to request authorization for
       * the user identity (login), relinquish authorization (logout), and set
       * callbacks to observe identity changes.
       *
       * See https://developer.mozilla.org/en-US/docs/Web/API/navigator.id
       */
      $get: [
        '$injector', '$q', function($injector, $q) {
          var onlogin, onlogout, provider;
          provider = this;
          onlogin = null;
          onlogout = null;
          return {

            /**
             * @ngdoc method
             * @name identity#logout
             * @description
             * https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.logout
             */
            logout: function() {
              var result;
              result = $injector.invoke(provider.forgetAuthentication, provider);
              return $q.when(result).then(onlogout);
            },

            /**
             * @ngdoc method
             * @name identity#request
             * @description
             * https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.request
             */
            request: function(options) {
              var oncancel, result;
              if (options == null) {
                options = {};
              }
              oncancel = options.oncancel;
              result = $injector.invoke(provider.requestAuthentication, provider);
              return $q.when(result).then(onlogin, oncancel);
            },

            /**
             * @ngdoc method
             * @name identity#watch
             * @description
             * https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.watch
             */
            watch: function(options) {
              var fn, key, onready, result;
              if (options == null) {
                options = {};
              }
              onlogin = options.onlogin, onlogout = options.onlogout, onready = options.onready;
              for (key in options) {
                fn = options[key];
                if (key.match(/^on/)) {
                  if (!angular.isFunction(fn)) {
                    throw new Error('argument "' + key + '" must be a function');
                  }
                }
              }
              if (!onlogin) {
                throw new Error('argument "onlogin" is required');
              }
              result = $injector.invoke(provider.checkAuthentication, provider);
              return $q.when(result).then(onlogin)["finally"](function() {
                return typeof onready === "function" ? onready() : void 0;
              });
            }
          };
        }
      ]
    };
  };

  angular.module('h.identity', []).provider('identity', identityProvider);

}).call(this);
