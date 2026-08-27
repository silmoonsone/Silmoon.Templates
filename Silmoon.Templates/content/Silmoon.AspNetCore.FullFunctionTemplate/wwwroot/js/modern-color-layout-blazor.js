/*
 * Modern Color Layout adapter for Blazor enhanced navigation.
 */

(function () {
    let enhancedLoadAttached = false;

    function refresh() {
        if (window.ModernColorLayout && typeof window.ModernColorLayout.refresh === "function") window.ModernColorLayout.refresh();
    }

    function init() {
        refresh();
        if (enhancedLoadAttached || !window.Blazor || typeof window.Blazor.addEventListener !== "function") return;

        window.Blazor.addEventListener("enhancedload", refresh);
        enhancedLoadAttached = true;
    }

    window.ModernColorLayoutBlazor = window.ModernColorLayoutBlazor || {};
    window.ModernColorLayoutBlazor.init = init;
})();
