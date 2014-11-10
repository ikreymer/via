(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Annotator.Plugin.Threading = (function(_super) {
    __extends(Threading, _super);

    function Threading() {
      this.annotationsLoaded = __bind(this.annotationsLoaded, this);
      this.annotationDeleted = __bind(this.annotationDeleted, this);
      this.beforeAnnotationCreated = __bind(this.beforeAnnotationCreated, this);
      return Threading.__super__.constructor.apply(this, arguments);
    }

    Threading.prototype.events = {
      'beforeAnnotationCreated': 'beforeAnnotationCreated',
      'annotationDeleted': 'annotationDeleted',
      'annotationsLoaded': 'annotationsLoaded'
    };

    Threading.prototype.root = null;

    Threading.prototype.pluginInit = function() {
      this.root = mail.messageContainer();
      return $.extend(this, mail.messageThread(), {
        thread: this.thread
      });
    };

    Threading.prototype.thread = function(messages) {
      var container, message, prev, reference, references, thread, _i, _j, _len, _len1;
      for (_i = 0, _len = messages.length; _i < _len; _i++) {
        message = messages[_i];
        if (message.id) {
          thread = this.getContainer(message.id);
          thread.message = message;
        } else {
          thread = mail.messageContainer(message);
        }
        prev = this.root;
        references = message.references || [];
        if (typeof message.references === 'string') {
          references = [references];
        }
        for (_j = 0, _len1 = references.length; _j < _len1; _j++) {
          reference = references[_j];
          container = this.getContainer(reference);
          if (!((container.parent != null) || container.hasDescendant(prev))) {
            prev.addChild(container);
          }
          prev = container;
        }
        if (!thread.hasDescendant(prev)) {
          (function() {
            var child, _k, _len2, _ref;
            _ref = prev.children;
            for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
              child = _ref[_k];
              if (child.message === message) {
                return;
              }
            }
            return prev.addChild(thread);
          })();
        }
      }
      this.pruneEmpties(this.root);
      return this.root;
    };

    Threading.prototype.beforeAnnotationCreated = function(annotation) {
      return this.thread([annotation]);
    };

    Threading.prototype.annotationDeleted = function(_arg) {
      var container, id;
      id = _arg.id;
      container = this.getContainer(id);
      container.message = null;
      return this.pruneEmpties(this.root);
    };

    Threading.prototype.annotationsLoaded = function(annotations) {
      var messages;
      messages = (this.root.flattenChildren() || []).concat(annotations);
      return this.thread(messages);
    };

    return Threading;

  })(Annotator.Plugin);

}).call(this);
