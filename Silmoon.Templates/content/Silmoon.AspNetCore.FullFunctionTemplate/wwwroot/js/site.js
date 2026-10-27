// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

(function () {
    const scriptPromises = {};

    window.ScriptLoader = window.ScriptLoader || {
        ensureLoaded: function (src) {
            if (scriptPromises[src]) return scriptPromises[src];

            scriptPromises[src] = new Promise(function (resolve, reject) {
                const script = document.createElement("script");
                script.dataset.scriptLoader = "true";
                script.src = src;
                script.onload = function () {
                    resolve(script);
                };
                script.onerror = function () {
                    delete scriptPromises[src];
                    reject(new Error("Script load failed: " + src));
                };
                document.body.appendChild(script);
            });

            return scriptPromises[src];
        }
    };

    // Custom elements also connect after static SSR enhanced navigation.
    // Components own their module URLs; import() caches modules across instances.
    if (!customElements.get("silmoon-module")) {
        customElements.define("silmoon-module", class extends HTMLElement {
            static observedAttributes = ["src"];

            connectedCallback() { this.load(); }
            attributeChangedCallback(name, previous, current) {
                if (previous !== current && this.isConnected) this.load();
            }

            load() {
                const src = this.getAttribute("src");
                if (src) import(src).catch(error => console.error("Component module load failed: " + src, error));
            }
        });
    }
})();
