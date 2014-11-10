(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Annotator.Plugin.Discovery = (function(_super) {
    __extends(Discovery, _super);

    function Discovery() {
      return Discovery.__super__.constructor.apply(this, arguments);
    }

    Discovery.prototype.pluginInit = function() {
      var href, svc;
      svc = $('link').filter(function() {
        return this.rel === 'service' && this.type === 'application/annotatorsvc+json';
      }).filter(function() {
        return this.href;
      });
      if (!svc.length) {
        return;
      }
      href = svc[0].href;
      return $.getJSON(href, (function(_this) {
        return function(data) {
          var action, info, options, url, _ref, _ref1, _ref2;
          if ((data != null ? data.links : void 0) == null) {
            return;
          }
          options = {
            prefix: href.replace(/\/$/, ''),
            urls: {}
          };
          if (((_ref = data.links.search) != null ? _ref.url : void 0) != null) {
            options.urls.search = data.links.search.url;
          }
          _ref1 = data.links.annotation || {};
          for (action in _ref1) {
            info = _ref1[action];
            if (info.url != null) {
              options.urls[action] = info.url;
            }
          }
          _ref2 = options.urls;
          for (action in _ref2) {
            url = _ref2[action];
            options.urls[action] = url.replace(options.prefix, '');
          }
          return _this.annotator.publish('serviceDiscovery', options);
        };
      })(this));
    };

    return Discovery;

  })(Annotator.Plugin);

}).call(this);
