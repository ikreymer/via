(function() {
  var $,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = Annotator.$;

  Annotator.Plugin.Heatmap = (function(_super) {
    __extends(Heatmap, _super);

    Heatmap.prototype.BUCKET_THRESHOLD_PAD = 30;

    Heatmap.prototype.BUCKET_SIZE = 16;

    Heatmap.prototype.html = "<div class=\"annotator-heatmap\">\n  <div class=\"annotator-heatmap-bar\"></div>\n</div>";

    Heatmap.prototype.options = {
      gapSize: 60
    };

    Heatmap.prototype.buckets = [];

    Heatmap.prototype.index = [];

    Heatmap.prototype.tabs = null;

    Heatmap.prototype.dynamicBucket = true;

    function Heatmap(element, options) {
      this.commentClick = __bind(this.commentClick, this);
      this.isComment = __bind(this.isComment, this);
      this.isLower = __bind(this.isLower, this);
      this.isUpper = __bind(this.isUpper, this);
      this._update = __bind(this._update, this);
      this._scheduleUpdate = __bind(this._scheduleUpdate, this);
      Heatmap.__super__.constructor.call(this, $(this.html), options);
      if (this.options.container != null) {
        $(this.options.container).append(this.element);
      } else {
        $(element).append(this.element);
      }
    }

    Heatmap.prototype.pluginInit = function() {
      var event, events, _i, _len;
      events = ['annotationCreated', 'annotationUpdated', 'annotationDeleted', 'annotationsLoaded'];
      for (_i = 0, _len = events.length; _i < _len; _i++) {
        event = events[_i];
        this.annotator.subscribe(event, this._scheduleUpdate);
      }
      this.element.on('click', (function(_this) {
        return function(event) {
          event.stopPropagation();
          return _this.annotator.showFrame();
        };
      })(this));
      this.element.on('mouseup', (function(_this) {
        return function(event) {
          return event.stopPropagation();
        };
      })(this));
      $(window).on('resize scroll', this._scheduleUpdate);
      $(document.body).on('resize scroll', '*', this._scheduleUpdate);
      this.annotator.subscribe("highlightsCreated", (function(_this) {
        return function(highlights) {
          var anchor, dir, next, page;
          anchor = Array.isArray(highlights) ? highlights[0].anchor : highlights.anchor;
          if (anchor.annotation.id != null) {
            _this._scheduleUpdate();
          }
          if ((_this.pendingScroll != null) && __indexOf.call(_this.pendingScroll.anchors, anchor) >= 0) {
            if (!--_this.pendingScroll.count) {
              page = _this.pendingScroll.page;
              dir = _this.pendingScroll.direction === "up" ? +1 : -1;
              next = _this.pendingScroll.anchors.reduce(function(acc, anchor) {
                var hl, start;
                start = acc.start, next = acc.next;
                hl = anchor.highlight[page];
                if ((next == null) || hl.getTop() * dir > start * dir) {
                  return {
                    start: hl.getTop(),
                    next: hl
                  };
                } else {
                  return acc;
                }
              }, {}).next;
              next.paddedScrollDownTo();
              return delete _this.pendingScroll;
            }
          }
        };
      })(this));
      this.annotator.subscribe("highlightRemoved", (function(_this) {
        return function(highlight) {
          if (highlight.annotation.id != null) {
            return _this._scheduleUpdate();
          }
        };
      })(this));
      return addEventListener("docPageScrolling", this._scheduleUpdate);
    };

    Heatmap.prototype._scheduleUpdate = function() {
      if (this._updatePending) {
        return;
      }
      this._updatePending = true;
      return setTimeout((function(_this) {
        return function() {
          delete _this._updatePending;
          return _this._update();
        };
      })(this), 60 / 1000);
    };

    Heatmap.prototype._collate = function(a, b) {
      var i, _i, _ref;
      for (i = _i = 0, _ref = a.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        if (a[i] < b[i]) {
          return -1;
        }
        if (a[i] > b[i]) {
          return 1;
        }
      }
      return 0;
    };

    Heatmap.prototype._collectVirtualAnnotations = function(startPage, endPage) {
      var anchor, anchors, page, results, _i;
      results = [];
      for (page = _i = startPage; startPage <= endPage ? _i <= endPage : _i >= endPage; page = startPage <= endPage ? ++_i : --_i) {
        anchors = this.annotator.anchors[page];
        if (anchors != null) {
          $.merge(results, (function() {
            var _j, _len, _results;
            _results = [];
            for (_j = 0, _len = anchors.length; _j < _len; _j++) {
              anchor = anchors[_j];
              if (!anchor.fullyRealized) {
                _results.push(anchor.annotation);
              }
            }
            return _results;
          })());
        }
      }
      return results;
    };

    Heatmap.prototype._jumpMinMax = function(annotations, direction) {
      var anchor, dir, hl, next, startPage;
      if (direction !== "up" && direction !== "down") {
        throw "Direction is mandatory!";
      }
      dir = direction === "up" ? +1 : -1;
      next = annotations.reduce(function(acc, ann) {
        var anchor, hl, start, _ref;
        start = acc.start, next = acc.next;
        anchor = ann.anchors[0];
        if ((next == null) || start.page * dir < anchor.startPage * dir) {
          return {
            start: {
              page: anchor.startPage,
              top: (_ref = anchor.highlight[anchor.startPage]) != null ? _ref.getTop() : void 0
            },
            next: [anchor]
          };
        } else if (start.page === anchor.startPage) {
          hl = anchor.highlight[start.page];
          if (hl != null) {
            if (start.top * dir < hl.getTop() * dir) {
              return {
                start: {
                  page: start.page,
                  top: hl.getTop()
                },
                next: [anchor]
              };
            } else {
              return acc;
            }
          } else {
            return {
              start: {
                page: start.page
              },
              next: $.merge(next, [anchor])
            };
          }
        } else {
          return acc;
        }
      }, {}).next;
      anchor = next[0];
      startPage = anchor.startPage;
      if (this.annotator.domMapper.isPageMapped(startPage)) {
        hl = anchor.highlight[startPage];
        return hl.paddedScrollTo(direction);
      } else {
        this.pendingScroll = {
          anchors: next,
          count: next.length,
          page: startPage,
          direction: direction
        };
        return this.annotator.domMapper.setPageIndex(startPage);
      }
    };

    Heatmap.prototype._update = function() {
      var above, b, below, currentPage, defaultView, element, firstPage, highlights, lastPage, mapper, max, points, wrapper, _i, _len, _ref, _ref1;
      wrapper = this.annotator.wrapper;
      highlights = this.annotator.getHighlights();
      defaultView = wrapper[0].ownerDocument.defaultView;
      above = [];
      below = [];
      mapper = this.annotator.domMapper;
      firstPage = 0;
      currentPage = mapper.getPageIndex();
      lastPage = mapper.getPageCount() - 1;
      $.merge(above, this._collectVirtualAnnotations(0, currentPage - 1));
      $.merge(below, this._collectVirtualAnnotations(currentPage + 1, lastPage));
      points = highlights.reduce((function(_this) {
        return function(points, hl, i) {
          var d, h, x;
          d = hl.annotation;
          x = hl.getTop() - defaultView.pageYOffset;
          h = hl.getHeight();
          if (x <= _this.BUCKET_SIZE + _this.BUCKET_THRESHOLD_PAD) {
            if (__indexOf.call(above, d) < 0) {
              above.push(d);
            }
          } else if (x + h >= $(window).height() - _this.BUCKET_SIZE) {
            if (__indexOf.call(below, d) < 0) {
              below.push(d);
            }
          } else {
            points.push([x, 1, d]);
            points.push([x + h, -1, d]);
          }
          return points;
        };
      })(this), []);
      _ref = points.sort(this._collate).reduce((function(_this) {
        return function(_arg, _arg1, i, points) {
          var a, a0, buckets, carry, d, index, j, last, toMerge, x, _i, _j, _len, _len1, _ref, _ref1;
          buckets = _arg.buckets, index = _arg.index, carry = _arg.carry;
          x = _arg1[0], d = _arg1[1], a = _arg1[2];
          if (d > 0) {
            if ((j = carry.annotations.indexOf(a)) < 0) {
              carry.annotations.unshift(a);
              carry.counts.unshift(1);
            } else {
              carry.counts[j]++;
            }
          } else {
            j = carry.annotations.indexOf(a);
            if (--carry.counts[j] === 0) {
              carry.annotations.splice(j, 1);
              carry.counts.splice(j, 1);
            }
          }
          if ((index.length === 0 || i === points.length - 1) || carry.annotations.length === 0 || x - index[index.length - 1] > _this.options.gapSize) {
            buckets.push(carry.annotations.slice());
            index.push(x);
          } else {
            if ((_ref = buckets[buckets.length - 2]) != null ? _ref.length : void 0) {
              last = buckets[buckets.length - 2];
              toMerge = buckets.pop();
              index.pop();
            } else {
              last = buckets[buckets.length - 1];
              toMerge = [];
            }
            _ref1 = carry.annotations;
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
              a0 = _ref1[_i];
              if (__indexOf.call(last, a0) < 0) {
                last.push(a0);
              }
            }
            for (_j = 0, _len1 = toMerge.length; _j < _len1; _j++) {
              a0 = toMerge[_j];
              if (__indexOf.call(last, a0) < 0) {
                last.push(a0);
              }
            }
          }
          return {
            buckets: buckets,
            index: index,
            carry: carry
          };
        };
      })(this), {
        buckets: [],
        index: [],
        carry: {
          annotations: [],
          counts: [],
          latest: 0
        }
      }), this.buckets = _ref.buckets, this.index = _ref.index;
      this.buckets.unshift([], above, []);
      this.index.unshift(0, this.BUCKET_THRESHOLD_PAD + 6, (this.BUCKET_THRESHOLD_PAD + this.BUCKET_SIZE) + 6);
      this.buckets.push([], below, []);
      this.index.push($(window).height() - this.BUCKET_SIZE - 12, $(window).height() - this.BUCKET_SIZE - 11, $(window).height());
      max = 0;
      _ref1 = this.buckets;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        b = _ref1[_i];
        max = Math.max(max, b.length);
      }
      element = this.element;
      this.tabs || (this.tabs = $([]));
      this.tabs.slice(this.buckets.length).remove();
      this.tabs = this.tabs.slice(0, this.buckets.length);
      $.each(this.buckets.slice(this.tabs.length), (function(_this) {
        return function() {
          var div;
          div = $('<div/>').appendTo(element);
          _this.tabs.push(div[0]);
          return div.addClass('heatmap-pointer').on('mousemove', function(event) {
            var bucket, hl, _j, _len1, _ref2, _ref3;
            bucket = _this.tabs.index(event.currentTarget);
            _ref2 = _this.annotator.getHighlights();
            for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
              hl = _ref2[_j];
              if (_ref3 = hl.annotation, __indexOf.call(_this.buckets[bucket], _ref3) >= 0) {
                hl.setActive(true, true);
              } else {
                if (!hl.isTemporary()) {
                  hl.setActive(false, true);
                }
              }
            }
            return _this.annotator.publish("finalizeHighlights");
          }).on('mouseout', function() {
            var hl, _j, _len1, _ref2;
            _ref2 = _this.annotator.getHighlights();
            for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
              hl = _ref2[_j];
              if (!hl.isTemporary()) {
                hl.setActive(false, true);
              }
            }
            return _this.annotator.publish("finalizeHighlights");
          }).on('click', function(event) {
            var annotations, bucket, pad;
            bucket = _this.tabs.index(event.currentTarget);
            event.stopPropagation();
            pad = defaultView.innerHeight * .2;
            if (_this.isUpper(bucket)) {
              _this.dynamicBucket = true;
              return _this._jumpMinMax(_this.buckets[bucket], "up");
            } else if (_this.isLower(bucket)) {
              _this.dynamicBucket = true;
              return _this._jumpMinMax(_this.buckets[bucket], "down");
            } else {
              annotations = _this.buckets[bucket].slice();
              return annotator.selectAnnotations(annotations, event.ctrlKey || event.metaKey);
            }
          });
        };
      })(this));
      this.tabs.attr('title', (function(_this) {
        return function(d) {
          var len;
          if ((len = _this.buckets[d].length) > 1) {
            return "Show " + len + " annotations";
          } else if (len > 0) {
            return "Show one annotation";
          }
        };
      })(this)).css('margin-top', (function(_this) {
        return function(d) {
          if (_this.isUpper(d) || _this.isLower(d)) {
            return '-9px';
          } else {
            return '-8px';
          }
        };
      })(this)).css('top', (function(_this) {
        return function(d) {
          return "" + ((_this.index[d] + _this.index[d + 1]) / 2) + "px";
        };
      })(this)).html((function(_this) {
        return function(d) {
          if (!_this.buckets[d]) {
            return;
          }
          return "<div class='label'>" + _this.buckets[d].length + "</div>";
        };
      })(this)).addClass((function(_this) {
        return function(d) {
          if (_this.isUpper(d)) {
            return 'upper';
          } else {
            return '';
          }
        };
      })(this)).addClass((function(_this) {
        return function(d) {
          if (_this.isLower(d)) {
            return 'lower';
          } else {
            return '';
          }
        };
      })(this)).css('display', (function(_this) {
        return function(d) {
          var bucket;
          bucket = _this.buckets[d];
          if (!bucket || bucket.length === 0) {
            return 'none';
          } else {
            return '';
          }
        };
      })(this));
      if (this.dynamicBucket) {
        return this.annotator.updateViewer(this._getDynamicBucket());
      }
    };

    Heatmap.prototype._getDynamicBucket = function() {
      var anchors, bottom, top, visible;
      top = window.pageYOffset;
      bottom = top + $(window).innerHeight();
      anchors = this.annotator.getHighlights();
      return visible = anchors.reduce((function(_this) {
        return function(acc, hl) {
          var _ref, _ref1;
          if ((top <= (_ref = hl.getTop()) && _ref <= bottom)) {
            if (_ref1 = hl.annotation, __indexOf.call(acc, _ref1) < 0) {
              acc.push(hl.annotation);
            }
          }
          return acc;
        };
      })(this), []);
    };

    Heatmap.prototype.isUpper = function(i) {
      return i === 1;
    };

    Heatmap.prototype.isLower = function(i) {
      return i === this.index.length - 2;
    };

    Heatmap.prototype.isComment = function(i) {
      return i === this._getCommentBucket();
    };

    Heatmap.prototype.commentClick = function() {
      this.dynamicBucket = false;
      return annotator.showViewer(this.buckets[this._getCommentBucket()]);
    };

    return Heatmap;

  })(Annotator.Plugin);

}).call(this);
