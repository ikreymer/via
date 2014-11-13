
__pywb_h = function() {

var embed_script;
var delete_script;

function init_h($window) {
    if (!$window.document || !$window.document.body) {
        return;
    }

    if ($window.annotator) {
        return;
    }

    $window.hypothesisConfig = function() {
        return {showHighlights: true};
    }

    if (delete_script) {
        $window.document.body.removeChild(delete_script);
        delete_script = null;
    }

    embed_script = $window.document.createElement("script");
    embed_script.src = "https://hypothes.is/app/embed.js";
    embed_script._no_rewrite = true;
    $window.document.body.appendChild(embed_script);
}

function delete_h($window) {
    if (embed_script) {
        $window.document.body.removeChild(embed_script);
        embed_script = null;
    }

    delete_script = $window.document.createElement("script");
    delete_script.src = "https://hypothes.is/assets/destroy.js";
    delete_script._no_rewrite = true;
    $window.document.body.appendChild(delete_script);
}

function toggle(elem, $window, statustext) {
    if (embed_script) {
        delete_h($window);
        elem.innerHTML = "Enable";
        if (statustext) {
            statustext.innerHTML = "off";
        }
    } else {
        console.log("Enabling");
        init_h($window);
        elem.innerHTML = "Disable";
        if (statustext) {
            statustext.innerHTML = "on";
        }
    }
}

return { init_h: init_h,
         delete_h: delete_h,
         toggle: toggle
       };
}();
