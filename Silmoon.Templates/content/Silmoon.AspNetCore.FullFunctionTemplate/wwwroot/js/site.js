// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

(function () {
    let modernColorLayoutPromise;

    window.ModernColorLayoutLoader = window.ModernColorLayoutLoader || {
        ensureLoaded: function (src) {
            if (window.ModernColorLayout && window.ModernColorLayout.init) {
                window.ModernColorLayout.init();
                return Promise.resolve();
            }
            if (modernColorLayoutPromise) return modernColorLayoutPromise;

            modernColorLayoutPromise = new Promise(function (resolve, reject) {
                const script = document.createElement("script");
                script.dataset.modernColorLayout = "true";
                script.src = src;
                script.onload = function () {
                    window.ModernColorLayout.init();
                    resolve();
                };
                script.onerror = reject;
                document.body.appendChild(script);
            });
            return modernColorLayoutPromise;
        }
    };
})();
