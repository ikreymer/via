(function () {
  // Injects the hypothesis dependencies. These can be either js or css, the
  // file extension is used to determine the loading method. This file is
  // pre-processed in order to insert the wgxpath and inject scripts.
  //
  // Custom injectors can be provided to load the scripts into a different
  // environment. Both script and stylesheet methods are provided with a url
  // and a callback fn that expects either an error object or null as the only
  // argument.
  //
  // For example a Chrome extension may look something like:
  //
  //   window.hypothesisInstall({
  //     script: function (src, fn) {
  //       chrome.tabs.executeScript(tab.id, {file: src}, fn);
  //     },
  //     stylesheet: function (href, fn) {
  //       chrome.tabs.insertCSS(tab.id, {file: href}, fn);
  //     }
  //   });
  window.hypothesisInstall = function (inject) {
    inject = inject || {};

    var resources = [];
    var injectStylesheet = inject.stylesheet || function injectStylesheet(href, fn) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = href;

      document.head.appendChild(link);
      fn(null);
    };

    var injectScript = inject.script || function injectScript(src, fn) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.onload = function () { fn(null) };
      script.onerror = function () { fn(new Error('Failed to load script: ' + src)) };
      script.src = src;

      document.head.appendChild(script);
    };

    if (!window.document.evaluate) {
      resources = resources.concat(['/assets/scripts/vendor/polyfills/wgxpath.install.js']);
    }

    if (typeof window.Annotator === 'undefined') {
      resources = resources.concat(['/assets/icomoon.css', '/assets/styles/inject.css?3d9a3a48', '/assets/scripts/vendor/jquery-1.10.2.js', '/assets/scripts/vendor/jquery.scrollintoview.js', '/assets/scripts/vendor/jschannel.js', '/assets/scripts/vendor/gettext.js', '/assets/scripts/vendor/annotator.js', '/assets/scripts/plugin/bridge.js?816ad017', '/assets/scripts/vendor/annotator.document.js', '/assets/scripts/plugin/heatmap.js?1193eb8b', '/assets/scripts/vendor/diff_match_patch_uncompressed.js', '/assets/scripts/vendor/dom_text_mapper.js', '/assets/scripts/vendor/dom_text_matcher.js', '/assets/scripts/vendor/text_match_engines.js', '/assets/scripts/vendor/annotator.domtextmapper.js', '/assets/scripts/vendor/annotator.textanchors.js', '/assets/scripts/vendor/annotator.fuzzytextanchors.js', '/assets/scripts/vendor/annotator.textrange.js', '/assets/scripts/vendor/annotator.textposition.js', '/assets/scripts/vendor/annotator.textquote.js', '/assets/scripts/vendor/annotator.texthighlights.js', '/assets/scripts/vendor/page_text_mapper_core.js', '/assets/scripts/vendor/annotator.pdf.js', '/assets/scripts/plugin/toolbar.js?a815c47f', '/assets/scripts/hypothesis.js?fd39b9e7', '/assets/bootstrap.js']);
    }

    (function next(err) {
      if (err) { throw err; }

      if (resources.length) {
        var url = resources.shift();
        var ext = url.split('?')[0].split('.').pop();
        var fn = (ext === 'css' ? injectStylesheet : injectScript);
        fn(url, next);
      }
    })();
  }

  var baseUrl = document.createElement('link');
  baseUrl.rel = 'sidebar';
  baseUrl.href = '/assets/app.html';
  baseUrl.type = 'application/annotator+html';
  document.head.appendChild(baseUrl);

  window.hypothesisInstall();
})();
