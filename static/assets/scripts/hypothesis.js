(function() {
  var $, Annotator,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Annotator = this.Annotator;

  $ = Annotator.$;

  Annotator.Guest = (function(_super) {
    var SHOW_HIGHLIGHTS_CLASS;

    __extends(Guest, _super);

    SHOW_HIGHLIGHTS_CLASS = 'annotator-highlights-always-on';

    Guest.prototype.events = {
      ".annotator-adder button click": "onAdderClick",
      ".annotator-adder button mousedown": "onAdderMousedown",
      ".annotator-adder button mouseup": "onAdderMouseup",
      "setTool": "onSetTool",
      "setVisibleHighlights": "setVisibleHighlights"
    };

    Guest.prototype.options = {
      TextHighlights: {},
      DomTextMapper: {},
      TextAnchors: {},
      TextRange: {},
      TextPosition: {},
      TextQuote: {},
      FuzzyTextAnchors: {},
      PDF: {},
      Document: {}
    };

    Guest.prototype.tool = 'comment';

    Guest.prototype.visibleHighlights = false;

    Guest.prototype.html = jQuery.extend({}, Annotator.prototype.html, {
      adder: '<div class="annotator-adder"><button class="h-icon-pen"></button></div>'
    });

    function Guest(element, options, config) {
      var name, opts, _ref;
      if (config == null) {
        config = {};
      }
      this.onAdderClick = __bind(this.onAdderClick, this);
      this.addToken = __bind(this.addToken, this);
      this.onAnchorClick = __bind(this.onAnchorClick, this);
      this.selectAnnotations = __bind(this.selectAnnotations, this);
      this.checkForStartSelection = __bind(this.checkForStartSelection, this);
      this.showEditor = __bind(this.showEditor, this);
      this.updateViewer = __bind(this.updateViewer, this);
      this.toggleViewerSelection = __bind(this.toggleViewerSelection, this);
      this.showViewer = __bind(this.showViewer, this);
      this.getHref = __bind(this.getHref, this);
      options.noScan = true;
      Guest.__super__.constructor.apply(this, arguments);
      delete this.options.noScan;
      if (window.PDFJS) {
        delete this.options.Document;
      }
      this.frame = $('<div></div>').appendTo(this.wrapper).addClass('annotator-frame annotator-outer annotator-collapsed');
      delete this.options.app;
      this.addPlugin('Bridge', {
        formatter: (function(_this) {
          return function(annotation) {
            var formatted, k, v, _ref;
            formatted = {};
            formatted['uri'] = _this.getHref();
            for (k in annotation) {
              v = annotation[k];
              if (k !== 'anchors') {
                formatted[k] = v;
              }
            }
            if ((_ref = formatted.document) != null ? _ref.title : void 0) {
              formatted.document.title = formatted.document.title.slice();
            }
            return formatted;
          };
        })(this),
        onConnect: (function(_this) {
          return function(source, origin, scope) {
            return _this.panel = _this._setupXDM({
              window: source,
              origin: origin,
              scope: "" + scope + ":provider",
              onReady: function() {
                _this.publish('panelReady');
                return setTimeout(function() {
                  var event;
                  event = document.createEvent("UIEvents");
                  event.initUIEvent("annotatorReady", false, false, window, 0);
                  event.annotator = _this;
                  return window.dispatchEvent(event);
                });
              }
            });
          };
        })(this)
      });
      _ref = this.options;
      for (name in _ref) {
        if (!__hasProp.call(_ref, name)) continue;
        opts = _ref[name];
        if (!this.plugins[name] && Annotator.Plugin[name]) {
          this.addPlugin(name, opts);
        }
      }
      if (!config.dontScan) {
        this._scan();
      }
      this.subscribe("highlightsCreated", (function(_this) {
        return function(highlights) {
          var annotations, hl;
          if (!Array.isArray(highlights)) {
            highlights = [highlights];
          }
          highlights.forEach(function(hl) {
            var firstHl, firstPage, hls, pages;
            hls = hl.anchor.highlight;
            pages = Object.keys(hls).map(function(s) {
              return parseInt(s);
            });
            firstPage = pages.sort()[0];
            firstHl = hls[firstPage];
            return hl.anchor.target.pos = {
              top: hl.getTop(),
              height: hl.getHeight()
            };
          });
          annotations = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = highlights.length; _i < _len; _i++) {
              hl = highlights[_i];
              _results.push(hl.annotation);
            }
            return _results;
          })();
          return _this.plugins.Bridge.sync(annotations);
        };
      })(this));
      this.subscribe("highlightRemoved", (function(_this) {
        return function(highlight) {
          var firstHl, firstPage, hls, pages;
          hls = highlight.anchor.highlight;
          pages = Object.keys(hls).map(function(s) {
            return parseInt(s);
          });
          if (pages.length) {
            firstPage = pages.sort()[0];
            firstHl = hls[firstPage];
            highlight.anchor.target.pos = {
              top: highlight.getTop(),
              heigth: highlight.getHeight()
            };
          } else {
            delete highlight.anchor.target.pos;
          }
          return _this.plugins.Bridge.sync([highlight.annotation]);
        };
      })(this));
    }

    Guest.prototype.getHref = function() {
      var _ref, _ref1, _ref2;
      return (_ref = (_ref1 = (_ref2 = this.plugins.PDF) != null ? _ref2.uri() : void 0) != null ? _ref1 : this.plugins.Document.uri()) != null ? _ref : Guest.__super__.getHref.apply(this, arguments);
    };

    Guest.prototype._setupXDM = function(options) {
      var channel;
      if ((options.origin.match(/^chrome-extension:\/\//)) || (options.origin.match(/^resource:\/\//))) {
        options.origin = '*';
      }
      channel = Channel.build(options);
      return channel.bind('onEditorHide', this.onEditorHide).bind('onEditorSubmit', this.onEditorSubmit).bind('setDynamicBucketMode', (function(_this) {
        return function(ctx, value) {
          if (!_this.plugins.Heatmap) {
            return;
          }
          if (_this.plugins.Heatmap.dynamicBucket === value) {
            return;
          }
          _this.plugins.Heatmap.dynamicBucket = value;
          if (value) {
            return _this.plugins.Heatmap._update();
          }
        };
      })(this)).bind('setActiveHighlights', (function(_this) {
        return function(ctx, tags) {
          var hl, _i, _len, _ref, _ref1;
          if (tags == null) {
            tags = [];
          }
          _ref = _this.getHighlights();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            hl = _ref[_i];
            if (_ref1 = hl.annotation.$$tag, __indexOf.call(tags, _ref1) >= 0) {
              hl.setActive(true, true);
            } else {
              if (!hl.isTemporary()) {
                hl.setActive(false, true);
              }
            }
          }
          return _this.publish("finalizeHighlights");
        };
      })(this)).bind('setFocusedHighlights', (function(_this) {
        return function(ctx, tags) {
          var annotation, hl, _i, _len, _ref, _ref1;
          if (tags == null) {
            tags = [];
          }
          _ref = _this.getHighlights();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            hl = _ref[_i];
            annotation = hl.annotation;
            if (_ref1 = annotation.$$tag, __indexOf.call(tags, _ref1) >= 0) {
              hl.setFocused(true, true);
            } else {
              hl.setFocused(false, true);
            }
          }
          return _this.publish("finalizeHighlights");
        };
      })(this)).bind('scrollTo', (function(_this) {
        return function(ctx, tag) {
          var hl, _i, _len, _ref;
          _ref = _this.getHighlights();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            hl = _ref[_i];
            if (hl.annotation.$$tag === tag) {
              hl.scrollTo();
              return;
            }
          }
        };
      })(this)).bind('getDocumentInfo', (function(_this) {
        return function(trans) {
          var _ref, _ref1;
          ((_ref = (_ref1 = _this.plugins.PDF) != null ? _ref1.getMetaData() : void 0) != null ? _ref : Promise.reject()).then(function(md) {
            return trans.complete({
              uri: _this.getHref(),
              metadata: md
            });
          })["catch"](function(problem) {
            var _ref;
            return trans.complete({
              uri: _this.getHref(),
              metadata: (_ref = _this.plugins.Document) != null ? _ref.metadata : void 0
            });
          });
          return trans.delayReturn(true);
        };
      })(this)).bind('setTool', (function(_this) {
        return function(ctx, name) {
          _this.tool = name;
          return _this.publish('setTool', name);
        };
      })(this)).bind('setVisibleHighlights', (function(_this) {
        return function(ctx, state) {
          return _this.publish('setVisibleHighlights', state);
        };
      })(this)).bind('updateHeatmap', (function(_this) {
        return function() {
          return _this.plugins.Heatmap._scheduleUpdate();
        };
      })(this));
    };

    Guest.prototype._setupWrapper = function() {
      this.wrapper = this.element.on('click', (function(_this) {
        return function(event) {
          var annotation, _ref;
          if ((_ref = _this.selectedTargets) != null ? _ref.length : void 0) {
            if (_this.tool === 'highlight') {
              return annotation = _this.setupAnnotation(_this.createAnnotation());
            }
          } else {
            return _this.hideFrame();
          }
        };
      })(this));
      return this;
    };

    Guest.prototype._setupViewer = function() {
      return this;
    };

    Guest.prototype._setupEditor = function() {
      return this;
    };

    Guest.prototype.destroy = function() {
      var name, plugin, _ref;
      $(document).unbind({
        "mouseup": this.checkForEndSelection,
        "mousedown": this.checkForStartSelection
      });
      $('#annotator-dynamic-style').remove();
      this.adder.remove();
      this.frame.remove();
      this.wrapper.find('.annotator-hl').each(function() {
        $(this).contents().insertBefore(this);
        return $(this).remove();
      });
      this.element.data('annotator', null);
      _ref = this.plugins;
      for (name in _ref) {
        plugin = _ref[name];
        this.plugins[name].destroy();
      }
      return this.removeEvents();
    };

    Guest.prototype.createAnnotation = function() {
      var annotation;
      annotation = Guest.__super__.createAnnotation.apply(this, arguments);
      this.plugins.Bridge.sync([annotation]);
      return annotation;
    };

    Guest.prototype.showViewer = function(annotations) {
      var a, _ref;
      return (_ref = this.panel) != null ? _ref.notify({
        method: "showViewer",
        params: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = annotations.length; _i < _len; _i++) {
            a = annotations[_i];
            _results.push(a.$$tag);
          }
          return _results;
        })()
      }) : void 0;
    };

    Guest.prototype.toggleViewerSelection = function(annotations) {
      var a, _ref;
      return (_ref = this.panel) != null ? _ref.notify({
        method: "toggleViewerSelection",
        params: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = annotations.length; _i < _len; _i++) {
            a = annotations[_i];
            _results.push(a.$$tag);
          }
          return _results;
        })()
      }) : void 0;
    };

    Guest.prototype.updateViewer = function(annotations) {
      var a, _ref;
      return (_ref = this.panel) != null ? _ref.notify({
        method: "updateViewer",
        params: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = annotations.length; _i < _len; _i++) {
            a = annotations[_i];
            _results.push(a.$$tag);
          }
          return _results;
        })()
      }) : void 0;
    };

    Guest.prototype.showEditor = function(annotation) {
      var _ref;
      return (_ref = this.panel) != null ? _ref.notify({
        method: "showEditor",
        params: annotation.$$tag
      }) : void 0;
    };

    Guest.prototype.onAnchorMouseover = function() {};

    Guest.prototype.onAnchorMouseout = function() {};

    Guest.prototype.onAnchorMousedown = function() {};

    Guest.prototype.checkForStartSelection = function(event) {
      if (!(event && this.isAnnotator(event.target))) {
        return this.mouseIsDown = true;
      }
    };

    Guest.prototype.confirmSelection = function() {
      var quote;
      if (this.selectedTargets.length !== 1) {
        return true;
      }
      quote = this.getQuoteForTarget(this.selectedTargets[0]);
      if (quote.length > 2) {
        return true;
      }
      return confirm("You have selected a very short piece of text: only " + length + " chars. Are you sure you want to highlight this?");
    };

    Guest.prototype.onSuccessfulSelection = function(event, immediate) {
      var s;
      if (!this.canAnnotate) {
        return;
      }
      if (this.tool === 'highlight') {
        if (!this.confirmSelection()) {
          return false;
        }
        this.selectedTargets = (function() {
          var _i, _len, _ref, _results;
          _ref = event.segments;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            s = _ref[_i];
            _results.push(this._getTargetFromSelection(s));
          }
          return _results;
        }).call(this);
        return;
      }
      return Guest.__super__.onSuccessfulSelection.apply(this, arguments);
    };

    Guest.prototype.selectAnnotations = function(annotations, toggle) {
      this.plugins.Heatmap.dynamicBucket = false;
      if (toggle) {
        return this.toggleViewerSelection(annotations);
      } else {
        return this.showViewer(annotations);
      }
    };

    Guest.prototype.onAnchorClick = function(event) {
      if (this.visibleHighlights || this.tool === 'highlight') {
        event.stopPropagation();
        return this.selectAnnotations(event.data.getAnnotations(event), event.metaKey || event.ctrlKey);
      }
    };

    Guest.prototype.setTool = function(name) {
      var _ref;
      return (_ref = this.panel) != null ? _ref.notify({
        method: 'setTool',
        params: name
      }) : void 0;
    };

    Guest.prototype.setVisibleHighlights = function(shouldShowHighlights) {
      var _ref;
      if (this.visibleHighlights === shouldShowHighlights) {
        return;
      }
      if ((_ref = this.panel) != null) {
        _ref.notify({
          method: 'setVisibleHighlights',
          params: shouldShowHighlights
        });
      }
      return this.toggleHighlightClass(shouldShowHighlights || this.tool === 'highlight');
    };

    Guest.prototype.toggleHighlightClass = function(shouldShowHighlights) {
      if (shouldShowHighlights) {
        this.element.addClass(SHOW_HIGHLIGHTS_CLASS);
      } else {
        this.element.removeClass(SHOW_HIGHLIGHTS_CLASS);
      }
      return this.visibleHighlights = shouldShowHighlights;
    };

    Guest.prototype.addComment = function() {
      return this.showEditor(this.createAnnotation());
    };

    Guest.prototype.showFrame = function() {
      var _ref;
      return (_ref = this.panel) != null ? _ref.notify({
        method: 'open'
      }) : void 0;
    };

    Guest.prototype.hideFrame = function() {
      var _ref;
      return (_ref = this.panel) != null ? _ref.notify({
        method: 'back'
      }) : void 0;
    };

    Guest.prototype.addToken = function(token) {
      return this.api.notify({
        method: 'addToken',
        params: token
      });
    };

    Guest.prototype.onAdderMouseup = function() {
      event.preventDefault();
      return event.stopPropagation();
    };

    Guest.prototype.onAdderMousedown = function() {};

    Guest.prototype.onAdderClick = function(event) {
      var annotation;
      event.preventDefault();
      event.stopPropagation();
      this.adder.hide();
      annotation = this.setupAnnotation(this.createAnnotation());
      Annotator.util.getGlobal().getSelection().removeAllRanges();
      return this.showEditor(annotation);
    };

    Guest.prototype.onSetTool = function(name) {
      switch (name) {
        case 'comment':
          return this.setVisibleHighlights(this.visibleHighlights);
        case 'highlight':
          return this.setVisibleHighlights(true);
      }
    };

    return Guest;

  })(Annotator);

  Annotator = this.Annotator;

  $ = Annotator.$;

  Annotator.Host = (function(_super) {
    __extends(Host, _super);

    Host.prototype.drag = {
      delta: 0,
      enabled: false,
      last: null,
      tick: false
    };

    function Host(element, options) {
      this._dragRefresh = __bind(this._dragRefresh, this);
      this._dragUpdate = __bind(this._dragUpdate, this);
      var app, hostOrigin, src;
      if (document.baseURI && (window.PDFView != null)) {
        hostOrigin = '*';
      } else {
        hostOrigin = window.location.origin;
        if (hostOrigin == null) {
          hostOrigin = window.location.protocol + "//" + window.location.host;
        }
      }
      src = options.app;
      if (options.firstRun) {
        src = src + (__indexOf.call(src, '?') >= 0 ? '&' : '?') + 'firstrun';
      }
      app = $('<iframe></iframe>').attr('name', 'hyp_sidebar_frame').attr('seamless', '').attr('src', src);
      Host.__super__.constructor.call(this, element, options, {
        dontScan: true
      });
      app.appendTo(this.frame);
      if (options.firstRun) {
        this.on('panelReady', (function(_this) {
          return function() {
            return _this.actuallyShowFrame({
              transition: false
            });
          };
        })(this));
      }
      if (this.plugins.Heatmap != null) {
        this._setupDragEvents();
        this.plugins.Heatmap.element.on('click', (function(_this) {
          return function(event) {
            if (_this.frame.hasClass('annotator-collapsed')) {
              return _this.showFrame();
            }
          };
        })(this));
      }
      this._scan();
    }

    Host.prototype.actuallyShowFrame = function(options) {
      if (options == null) {
        options = {
          transition: true
        };
      }
      if (!this.drag.enabled) {
        this.frame.css({
          'margin-left': "" + (-1 * this.frame.width()) + "px"
        });
      }
      if (options.transition) {
        this.frame.removeClass('annotator-no-transition');
      } else {
        this.frame.addClass('annotator-no-transition');
      }
      return this.frame.removeClass('annotator-collapsed');
    };

    Host.prototype._setupXDM = function(options) {
      var channel;
      channel = Host.__super__._setupXDM.apply(this, arguments);
      return channel.bind('showFrame', (function(_this) {
        return function(ctx) {
          return _this.actuallyShowFrame();
        };
      })(this)).bind('hideFrame', (function(_this) {
        return function(ctx) {
          _this.frame.css({
            'margin-left': ''
          });
          _this.frame.removeClass('annotator-no-transition');
          return _this.frame.addClass('annotator-collapsed');
        };
      })(this)).bind('dragFrame', (function(_this) {
        return function(ctx, screenX) {
          return _this._dragUpdate(screenX);
        };
      })(this)).bind('getMaxBottom', (function(_this) {
        return function() {
          var all, bottom, el, p, sel, t, x, y, z;
          sel = '*' + ((function() {
            var _i, _len, _ref, _results;
            _ref = ['adder', 'outer', 'notice', 'filter', 'frame'];
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              x = _ref[_i];
              _results.push(":not(.annotator-" + x + ")");
            }
            return _results;
          })()).join('');
          all = (function() {
            var _i, _len, _ref, _ref1, _results;
            _ref = $(document.body).find(sel);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              el = _ref[_i];
              p = $(el).css('position');
              t = $(el).offset().top;
              z = $(el).css('z-index');
              if ((y = (_ref1 = /\d+/.exec($(el).css('top'))) != null ? _ref1[0] : void 0)) {
                t = Math.min(Number(y, t));
              }
              if ((p === 'absolute' || p === 'fixed') && t === 0 && z !== 'auto') {
                bottom = $(el).outerHeight(false);
                if (bottom > 80) {
                  _results.push(0);
                } else {
                  _results.push(bottom);
                }
              } else {
                _results.push(0);
              }
            }
            return _results;
          })();
          return Math.max.apply(Math, all);
        };
      })(this));
    };

    Host.prototype._setupDragEvents = function() {
      var dragEnd, dragStart, el, handle, _i, _len, _ref;
      el = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      el.width = el.height = 1;
      this.element.append(el);
      dragStart = (function(_this) {
        return function(event) {
          var m;
          event.dataTransfer.dropEffect = 'none';
          event.dataTransfer.effectAllowed = 'none';
          event.dataTransfer.setData('text/plain', '');
          event.dataTransfer.setDragImage(el, 0, 0);
          _this.drag.enabled = true;
          _this.drag.last = event.screenX;
          m = parseInt((getComputedStyle(_this.frame[0])).marginLeft);
          _this.frame.css({
            'margin-left': "" + m + "px"
          });
          return _this.showFrame();
        };
      })(this);
      dragEnd = (function(_this) {
        return function(event) {
          _this.drag.enabled = false;
          return _this.drag.last = null;
        };
      })(this);
      _ref = [this.plugins.Heatmap.element[0], this.plugins.Toolbar.buttons[0]];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        handle = _ref[_i];
        handle.draggable = true;
        handle.addEventListener('dragstart', dragStart);
        handle.addEventListener('dragend', dragEnd);
      }
      return document.addEventListener('dragover', (function(_this) {
        return function(event) {
          return _this._dragUpdate(event.screenX);
        };
      })(this));
    };

    Host.prototype._dragUpdate = function(screenX) {
      if (!this.drag.enabled) {
        return;
      }
      if (this.drag.last != null) {
        this.drag.delta += screenX - this.drag.last;
      }
      this.drag.last = screenX;
      if (!this.drag.tick) {
        this.drag.tick = true;
        return window.requestAnimationFrame(this._dragRefresh);
      }
    };

    Host.prototype._dragRefresh = function() {
      var d, m, w;
      d = this.drag.delta;
      this.drag.delta = 0;
      this.drag.tick = false;
      m = parseInt((getComputedStyle(this.frame[0])).marginLeft);
      w = -1 * m;
      m += d;
      w -= d;
      this.frame.addClass('annotator-no-transition');
      return this.frame.css({
        'margin-left': "" + m + "px",
        width: "" + w + "px"
      });
    };

    return Host;

  })(Annotator.Guest);

}).call(this);
