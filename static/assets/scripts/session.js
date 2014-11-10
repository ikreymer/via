(function() {
  var FlashProvider, Notification, SessionProvider,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  angular.module('h.session', ['ngResource']);


  /**
   * @ngdoc provider
   * @name sessionProvider
   * @property {Object} actions additional actions to mix into the resource.
   * @property {Object} options additional options mix into resource actions.
   * @description
   * This class provides an angular $resource factory as an angular service
   * for manipulating server-side sessions. It defines the REST-ish actions
   * that return the state of the users session after modifying it through
   * registration, authentication, or account management.
   */

  SessionProvider = (function() {
    SessionProvider.prototype.actions = null;

    SessionProvider.prototype.options = null;

    function SessionProvider() {
      this.actions = {};
      this.options = {};
    }


    /**
     * @ngdoc service
     * @name session
     * @description
     * An angular resource factory for sessions. See the documentation for
     * {@link sessionProvider sessionProvider} for ways to configure the
     * resource.
     *
     * @example
     * Using the session with BrowserID.
     *
     *   navigator.id.beginAuthentication(function (email) {
     *     session.load(function (data) {
     *       var user = data.user;
     *       if(user && user.email == email) {
     *         navigator.id.completeAuthentication();
     *       } else {
     *         displayLoginForm();
     *       }
     *     });
     *   });
     */

    SessionProvider.prototype.$get = [
      '$http', '$q', '$resource', 'documentHelpers', 'flash', function($http, $q, $resource, documentHelpers, flash) {
        var actions, endpoint, name, options, prepare, process, provider, xsrfToken, _ref;
        actions = {};
        provider = this;
        xsrfToken = null;
        prepare = function(data, headersGetter) {
          var headers;
          if (xsrfToken) {
            headers = headersGetter();
            headers[$http.defaults.xsrfHeaderName] = xsrfToken;
          }
          return angular.toJson(data);
        };
        process = function(data, headersGetter) {
          var model, msgs, q, _ref;
          data = angular.fromJson(data);
          model = data.model || {};
          model.errors = data.errors;
          model.reason = data.reason;
          _ref = data.flash;
          for (q in _ref) {
            msgs = _ref[q];
            flash(q, msgs);
          }
          xsrfToken = model.csrf;
          return model;
        };
        _ref = provider.actions;
        for (name in _ref) {
          options = _ref[name];
          actions[name] = angular.extend({}, options, this.options);
          actions[name].transformRequest = prepare;
          actions[name].transformResponse = process;
        }
        //endpoint = documentHelpers.absoluteURI('/app');
        // pywb PATCH
        endpoint = documentHelpers.absoluteURI('/live/https://hypothes.is/app');
        return $resource(endpoint, {}, actions);
      }
    ];

    return SessionProvider;

  })();

  angular.module('h.session').provider('session', SessionProvider);

  Notification = (function(_super) {
    __extends(Notification, _super);

    Notification.INFO = 'info';

    Notification.ERROR = 'error';

    Notification.SUCCESS = 'success';

    function Notification(options) {
      this.hide = __bind(this.hide, this);
      this.show = __bind(this.show, this);
      var element;
      element = $(this.options.html).hide()[0];
      Annotator.Delegator.call(this, element, options);
    }

    Notification.prototype.show = function(message, status) {
      if (status == null) {
        status = Notification.INFO;
      }
      Notification.__super__.show.apply(this, arguments);
      return this.element.prependTo(document.body).slideDown();
    };

    Notification.prototype.hide = function() {
      Notification.__super__.hide.apply(this, arguments);
      return this.element.slideUp((function(_this) {
        return function() {
          return _this.element.remove();
        };
      })(this));
    };

    return Notification;

  })(Annotator.Notification);

  FlashProvider = (function() {
    function FlashProvider() {}

    FlashProvider.prototype.queues = {
      '': [],
      info: [],
      error: [],
      success: []
    };

    FlashProvider.prototype.notice = null;

    FlashProvider.prototype.$get = function() {
      return angular.bind(this, this._flash);
    };

    FlashProvider.prototype._process = function() {
      var msg, msgs, notice, q, _ref, _ref1, _results;
      _ref = this.queues;
      _results = [];
      for (q in _ref) {
        msgs = _ref[q];
        if (msgs.length) {
          msg = msgs.shift();
          if (!q) {
            _ref1 = msg, q = _ref1[0], msg = _ref1[1];
          }
          notice = new Notification();
          notice.show(msg, q);
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    FlashProvider.prototype._flash = function(queue, messages) {
      var _ref;
      if (this.queues[queue] != null) {
        this.queues[queue] = (_ref = this.queues[queue]) != null ? _ref.concat(messages) : void 0;
        return this._process();
      }
    };

    return FlashProvider;

  })();

  angular.module('h.session').provider('flash', FlashProvider);

}).call(this);
