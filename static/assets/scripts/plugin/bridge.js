(function() {
  var $,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  $ = Annotator.$;

  Annotator.Plugin.Bridge = (function(_super) {
    __extends(Bridge, _super);

    Bridge.prototype.events = {
      'beforeAnnotationCreated': 'beforeAnnotationCreated',
      'annotationCreated': 'annotationCreated',
      'annotationUpdated': 'annotationUpdated',
      'annotationDeleted': 'annotationDeleted',
      'annotationsLoaded': 'annotationsLoaded'
    };

    Bridge.prototype.options = {
      origin: '*',
      scope: 'annotator:bridge',
      gateway: false,
      onConnect: function() {
        return true;
      },
      formatter: function(annotation) {
        return annotation;
      },
      parser: function(annotation) {
        return annotation;
      },
      merge: function(local, remote) {
        var k, v;
        for (k in remote) {
          v = remote[k];
          local[k] = v;
        }
        return local;
      }
    };

    Bridge.prototype.cache = null;

    Bridge.prototype.links = null;

    Bridge.prototype.updating = null;

    function Bridge(elem, options) {
      this.annotationsLoaded = __bind(this.annotationsLoaded, this);
      this.annotationDeleted = __bind(this.annotationDeleted, this);
      this.annotationUpdated = __bind(this.annotationUpdated, this);
      this.annotationCreated = __bind(this.annotationCreated, this);
      this.beforeAnnotationCreated = __bind(this.beforeAnnotationCreated, this);
      this._onMessage = __bind(this._onMessage, this);
      var window;
      if (options.window != null) {
        window = options.window;
        delete options.window;
        Bridge.__super__.constructor.call(this, elem, options);
        this.options.window = window;
      } else {
        Bridge.__super__.constructor.apply(this, arguments);
      }
      this.cache = {};
      this.links = [];
      this.updating = {};
    }

    Bridge.prototype.pluginInit = function() {
      $(window).on('message', this._onMessage);
      return this._beacon();
    };

    Bridge.prototype.destroy = function() {
      Bridge.__super__.destroy.apply(this, arguments);
      return $(window).off('message', this._onMessage);
    };

    Bridge.prototype._tag = function(msg, tag) {
      if (msg.$$tag) {
        return msg;
      }
      tag = tag || (window.btoa(Math.random()));
      Object.defineProperty(msg, '$$tag', {
        value: tag
      });
      this.cache[tag] = msg;
      return msg;
    };

    Bridge.prototype._parse = function(_arg) {
      var local, merged, msg, remote, tag;
      tag = _arg.tag, msg = _arg.msg;
      local = this.cache[tag];
      remote = this.options.parser(msg);
      if (local != null) {
        merged = this.options.merge(local, remote);
      } else {
        merged = remote;
      }
      return this._tag(merged, tag);
    };

    Bridge.prototype._format = function(annotation) {
      var msg;
      this._tag(annotation);
      msg = this.options.formatter(annotation);
      return {
        tag: annotation.$$tag,
        msg: msg
      };
    };

    Bridge.prototype._build = function(options) {
      var channel;
      if ((options.origin.match(/^chrome-extension:\/\//)) || (options.origin.match(/^resource:\/\//))) {
        options.origin = '*';
      }
      return channel = Channel.build(options).bind('beforeCreateAnnotation', (function(_this) {
        return function(txn, annotation) {
          annotation = _this._parse(annotation);
          delete _this.cache[annotation.$$tag];
          _this.annotator.publish('beforeAnnotationCreated', annotation);
          _this.cache[annotation.$$tag] = annotation;
          return _this._format(annotation);
        };
      })(this)).bind('createAnnotation', (function(_this) {
        return function(txn, annotation) {
          annotation = _this._parse(annotation);
          delete _this.cache[annotation.$$tag];
          _this.annotator.publish('annotationCreated', annotation);
          _this.cache[annotation.$$tag] = annotation;
          return _this._format(annotation);
        };
      })(this)).bind('updateAnnotation', (function(_this) {
        return function(txn, annotation) {
          annotation = _this._parse(annotation);
          delete _this.cache[annotation.$$tag];
          annotation = _this.annotator.updateAnnotation(annotation);
          _this.cache[annotation.$$tag] = annotation;
          return _this._format(annotation);
        };
      })(this)).bind('deleteAnnotation', (function(_this) {
        return function(txn, annotation) {
          var res;
          annotation = _this._parse(annotation);
          delete _this.cache[annotation.$$tag];
          annotation = _this.annotator.deleteAnnotation(annotation);
          res = _this._format(annotation);
          delete _this.cache[annotation.$$tag];
          return res;
        };
      })(this)).bind('sync', (function(_this) {
        return function(ctx, annotations) {
          var a, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = annotations.length; _i < _len; _i++) {
            a = annotations[_i];
            _results.push(_this._format(_this._parse(a)));
          }
          return _results;
        };
      })(this)).bind('loadAnnotations', (function(_this) {
        return function(txn, annotations) {
          var a;
          annotations = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = annotations.length; _i < _len; _i++) {
              a = annotations[_i];
              _results.push(this._parse(a));
            }
            return _results;
          }).call(_this);
          return _this.annotator.loadAnnotations(annotations);
        };
      })(this));
    };

    Bridge.prototype._beacon = function() {
      var child, parent, queue, _results;
      queue = [window.top];
      _results = [];
      while (queue.length) {
        parent = queue.shift();
        if (parent !== window) {
          parent.postMessage('__annotator_dhcp_discovery', this.options.origin);
        }
        _results.push((function() {
          var _i, _len, _ref, _results1;
          _ref = parent.frames;
          _results1 = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            _results1.push(queue.push(child));
          }
          return _results1;
        })());
      }
      return _results;
    };

    Bridge.prototype._call = function(options) {
      var deferreds, _makeDestroyFn;
      _makeDestroyFn = (function(_this) {
        return function(c) {
          return function(error, reason) {
            var l;
            c.destroy();
            return _this.links = (function() {
              var _i, _len, _ref, _results;
              _ref = this.links;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                l = _ref[_i];
                if (l.channel !== c) {
                  _results.push(l);
                }
              }
              return _results;
            }).call(_this);
          };
        };
      })(this);
      deferreds = this.links.map(function(l) {
        var d;
        d = $.Deferred().fail(_makeDestroyFn(l.channel));
        options = $.extend({}, options, {
          success: function(result) {
            return d.resolve(result);
          },
          error: function(error, reason) {
            if (error !== 'timeout_error') {
              return d.reject(error, reason);
            } else {
              return d.resolve(null);
            }
          },
          timeout: 1000
        });
        l.channel.call(options);
        return d.promise();
      });
      return $.when.apply($, deferreds).then((function(_this) {
        return function() {
          var acc, foldFn, results;
          results = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          if (Array.isArray(results[0])) {
            acc = [];
            foldFn = function(_, cur) {
              var a, _i, _len, _results;
              _results = [];
              for (_i = 0, _len = cur.length; _i < _len; _i++) {
                a = cur[_i];
                _results.push(_this._parse(a));
              }
              return _results;
            };
          } else {
            acc = {};
            foldFn = function(_, cur) {
              return _this._parse(cur);
            };
          }
          return typeof options.callback === "function" ? options.callback(null, results.reduce(foldFn, acc)) : void 0;
        };
      })(this)).fail((function(_this) {
        return function(failure) {
          return typeof options.callback === "function" ? options.callback(failure) : void 0;
        };
      })(this));
    };

    Bridge.prototype._notify = function(options) {
      var l, _i, _len, _ref, _results;
      _ref = this.links;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        l = _ref[_i];
        _results.push(l.channel.notify(options));
      }
      return _results;
    };

    Bridge.prototype._onMessage = function(e) {
      var channel, data, match, options, origin, scope, source, _ref;
      _ref = e.originalEvent, source = _ref.source, origin = _ref.origin, data = _ref.data;
      match = typeof data.match === "function" ? data.match(/^__annotator_dhcp_(discovery|ack|offer)(:\d+)?$/) : void 0;
      if (!match) {
        return;
      }
      if (match[1] === 'discovery') {
        if (this.options.gateway) {
          scope = ':' + ('' + Math.random()).replace(/\D/g, '');
          source.postMessage('__annotator_dhcp_offer' + scope, origin);
        } else {
          source.postMessage('__annotator_dhcp_ack', origin);
          return;
        }
      } else if (match[1] === 'ack') {
        if (this.options.gateway) {
          scope = ':' + ('' + Math.random()).replace(/\D/g, '');
          source.postMessage('__annotator_dhcp_offer' + scope, origin);
        } else {
          return;
        }
      } else if (match[1] === 'offer') {
        if (this.options.gateway) {
          return;
        } else {
          scope = match[2];
        }
      }
      scope = this.options.scope + scope;
      options = $.extend({}, this.options, {
        window: source,
        origin: origin,
        scope: scope,
        onReady: (function(_this) {
          return function() {
            var a, annotations, t;
            options.onConnect.call(_this.annotator, source, origin, scope);
            annotations = (function() {
              var _ref1, _results;
              _ref1 = this.cache;
              _results = [];
              for (t in _ref1) {
                a = _ref1[t];
                _results.push(this._format(a));
              }
              return _results;
            }).call(_this);
            if (annotations.length) {
              return channel.notify({
                method: 'loadAnnotations',
                params: annotations
              });
            }
          };
        })(this)
      });
      channel = this._build(options);
      return this.links.push({
        channel: channel,
        window: source
      });
    };

    Bridge.prototype.beforeAnnotationCreated = function(annotation) {
      if (annotation.$$tag != null) {
        return;
      }
      this.beforeCreateAnnotation(annotation);
      return this;
    };

    Bridge.prototype.annotationCreated = function(annotation) {
      if (!((annotation.$$tag != null) && this.cache[annotation.$$tag])) {
        return;
      }
      this.createAnnotation(annotation);
      return this;
    };

    Bridge.prototype.annotationUpdated = function(annotation) {
      if (!((annotation.$$tag != null) && this.cache[annotation.$$tag])) {
        return;
      }
      this.updateAnnotation(annotation);
      return this;
    };

    Bridge.prototype.annotationDeleted = function(annotation) {
      if (!((annotation.$$tag != null) && this.cache[annotation.$$tag])) {
        return;
      }
      this.deleteAnnotation(annotation, (function(_this) {
        return function(err) {
          if (err) {
            return _this.annotator.setupAnnotation(annotation);
          } else {
            return delete _this.cache[annotation.$$tag];
          }
        };
      })(this));
      return this;
    };

    Bridge.prototype.annotationsLoaded = function(annotations) {
      var a;
      annotations = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = annotations.length; _i < _len; _i++) {
          a = annotations[_i];
          if (!a.$$tag) {
            _results.push(this._format(a));
          }
        }
        return _results;
      }).call(this);
      if (!annotations.length) {
        return;
      }
      this._notify({
        method: 'loadAnnotations',
        params: annotations
      });
      return this;
    };

    Bridge.prototype.beforeCreateAnnotation = function(annotation, cb) {
      this._call({
        method: 'beforeCreateAnnotation',
        params: this._format(annotation),
        callback: cb
      });
      return annotation;
    };

    Bridge.prototype.createAnnotation = function(annotation, cb) {
      this._call({
        method: 'createAnnotation',
        params: this._format(annotation),
        callback: cb
      });
      return annotation;
    };

    Bridge.prototype.updateAnnotation = function(annotation, cb) {
      this._call({
        method: 'updateAnnotation',
        params: this._format(annotation),
        callback: cb
      });
      return annotation;
    };

    Bridge.prototype.deleteAnnotation = function(annotation, cb) {
      this._call({
        method: 'deleteAnnotation',
        params: this._format(annotation),
        callback: cb
      });
      return annotation;
    };

    Bridge.prototype.sync = function(annotations, cb) {
      var a;
      annotations = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = annotations.length; _i < _len; _i++) {
          a = annotations[_i];
          _results.push(this._format(a));
        }
        return _results;
      }).call(this);
      this._call({
        method: 'sync',
        params: annotations,
        callback: cb
      });
      return this;
    };

    return Bridge;

  })(Annotator.Plugin);

}).call(this);
