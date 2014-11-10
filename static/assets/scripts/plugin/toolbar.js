(function() {
  var $, makeButton,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = Annotator.$;

  makeButton = function(item) {
    var anchor, button;
    anchor = $('<a></a>').attr('href', '').attr('title', item.title).on(item.on).addClass(item["class"]);
    button = $('<li></li>').append(anchor);
    return button[0];
  };

  Annotator.Plugin.Toolbar = (function(_super) {
    var PUSHED_CLASS;

    __extends(Toolbar, _super);

    function Toolbar() {
      return Toolbar.__super__.constructor.apply(this, arguments);
    }

    PUSHED_CLASS = 'annotator-pushed';

    Toolbar.prototype.events = {
      '.annotator-toolbar mouseenter': 'show',
      '.annotator-toolbar mouseleave': 'hide',
      'setTool': 'onSetTool',
      'setVisibleHighlights': 'onSetVisibleHighlights'
    };

    Toolbar.prototype.html = '<div class="annotator-toolbar annotator-hide"></div>';

    Toolbar.prototype.pluginInit = function() {
      var item, items, list;
      this.annotator.toolbar = this.toolbar = $(this.html);
      if (this.options.container != null) {
        $(this.options.container).append(this.toolbar);
      } else {
        $(this.element).append(this.toolbar);
      }
      items = [
        {
          "title": "Toggle Sidebar",
          "class": "annotator-toolbar-toggle h-icon-comment",
          "on": {
            "click": (function(_this) {
              return function(event) {
                var collapsed;
                event.preventDefault();
                event.stopPropagation();
                collapsed = _this.annotator.frame.hasClass('annotator-collapsed');
                if (collapsed) {
                  return _this.annotator.showFrame();
                } else {
                  return _this.annotator.hideFrame();
                }
              };
            })(this),
            "mouseup": function(event) {
              return $(event.target).blur();
            }
          }
        }, {
          "title": "Show Annotations",
          "class": "h-icon-visible",
          "on": {
            "click": (function(_this) {
              return function(event) {
                var state;
                event.preventDefault();
                event.stopPropagation();
                state = !_this.annotator.visibleHighlights;
                return _this.annotator.setVisibleHighlights(state);
              };
            })(this)
          }
        }, {
          "title": "Highlighting Mode",
          "class": "h-icon-highlighter",
          "on": {
            "click": (function(_this) {
              return function(event) {
                var state, tool;
                event.preventDefault();
                event.stopPropagation();
                state = !(_this.annotator.tool === 'highlight');
                tool = state ? 'highlight' : 'comment';
                return _this.annotator.setTool(tool);
              };
            })(this)
          }
        }, {
          "title": "New Comment",
          "class": "h-icon-plus",
          "on": {
            "click": (function(_this) {
              return function(event) {
                event.preventDefault();
                event.stopPropagation();
                return _this.annotator.addComment();
              };
            })(this)
          }
        }
      ];
      this.buttons = $((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          item = items[_i];
          _results.push(makeButton(item));
        }
        return _results;
      })());
      list = $('<ul></ul>');
      this.buttons.appendTo(list);
      return this.toolbar.append(list);
    };

    Toolbar.prototype.show = function() {
      return this.toolbar.removeClass('annotator-hide');
    };

    Toolbar.prototype.hide = function() {
      return this.toolbar.addClass('annotator-hide');
    };

    Toolbar.prototype.onSetTool = function(name) {
      if (name === 'highlight') {
        $(this.buttons[2]).addClass(PUSHED_CLASS);
      } else {
        $(this.buttons[2]).removeClass(PUSHED_CLASS);
      }
      return this._updateStickyButtons();
    };

    Toolbar.prototype.onSetVisibleHighlights = function(state) {
      if (state) {
        $(this.buttons[1]).addClass(PUSHED_CLASS);
      } else {
        $(this.buttons[1]).removeClass(PUSHED_CLASS);
      }
      return this._updateStickyButtons();
    };

    Toolbar.prototype._updateStickyButtons = function() {
      var count, height, _ref, _ref1;
      count = $(this.buttons).filter(function() {
        return $(this).hasClass(PUSHED_CLASS);
      }).length;
      if (count) {
        height = (count + 1) * 35;
        this.toolbar.css("min-height", "" + height + "px");
      } else {
        height = 35;
        this.toolbar.css("min-height", "");
      }
      if ((_ref = this.annotator.plugins.Heatmap) != null) {
        _ref.BUCKET_THRESHOLD_PAD = height;
      }
      return (_ref1 = this.annotator.plugins.Heatmap) != null ? _ref1._update() : void 0;
    };

    return Toolbar;

  })(Annotator.Plugin);

}).call(this);
