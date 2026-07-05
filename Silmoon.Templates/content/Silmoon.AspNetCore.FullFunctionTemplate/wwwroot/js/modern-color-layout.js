/*
 * Modern Color Layout
 * Extracted from Silmoon.AspNetCore.FullFunctionTemplate for standalone HTML use.
 * Requires only standard browser APIs. Bootstrap JS is optional and only needed
 * for Bootstrap components such as tabs, dropdowns, and modals.
 */

(function () {
    const themeStorageKey = "modern-color-layout-theme";
    const themeButtonSelector = ".theme-btn, .theme-menu-btn";
    const darkSchemeQuery = "(prefers-color-scheme: dark)";

    function queryAll(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function setThemeAttribute(theme) {
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        } else if (theme === "light") {
            document.documentElement.setAttribute("data-theme", "light");
        } else {
            const systemPrefersDark = window.matchMedia && window.matchMedia(darkSchemeQuery).matches;
            if (systemPrefersDark) {
                document.documentElement.setAttribute("data-theme", "dark");
            } else {
                document.documentElement.removeAttribute("data-theme");
            }
        }
    }

    function updateThemeButtonState() {
        const currentTheme = localStorage.getItem(themeStorageKey) || "auto";
        queryAll(themeButtonSelector).forEach(function (button) {
            const active = button.dataset.theme === currentTheme;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    function updateTheme(theme) {
        setThemeAttribute(theme);

        if (theme === "auto") {
            localStorage.removeItem(themeStorageKey);
        } else {
            localStorage.setItem(themeStorageKey, theme);
        }

        updateThemeButtonState();
    }

    function initTheme() {
        updateTheme(localStorage.getItem(themeStorageKey) || "auto");

        if (window.matchMedia) {
            window.matchMedia(darkSchemeQuery).addEventListener("change", function () {
                if (!localStorage.getItem(themeStorageKey)) {
                    updateTheme("auto");
                }
            });
        }
    }

    function initMenu() {
        const menu = document.getElementById("menu");
        const toggleMenu = document.getElementById("toggle-menu");

        if (!menu || !toggleMenu) return;

        function closeMenu() {
            menu.classList.remove("open");
            toggleMenu.setAttribute("aria-expanded", "false");
        }

        function openOrCloseMenu() {
            const isOpen = menu.classList.toggle("open");
            toggleMenu.setAttribute("aria-expanded", isOpen ? "true" : "false");
        }

        toggleMenu.setAttribute("aria-expanded", "false");

        toggleMenu.addEventListener("click", function (event) {
            event.stopPropagation();
            openOrCloseMenu();
        });

        queryAll("#menu a").forEach(function (link) {
            link.addEventListener("click", function () {
                queryAll("#menu a").forEach(function (item) {
                    item.classList.remove("active");
                });
                link.classList.add("active");
                closeMenu();
            });
        });

        document.addEventListener("click", function (event) {
            if (!event.target.closest("#menu, #toggle-menu")) {
                closeMenu();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeMenu();
            }
        });
    }

    function initThemeButtons() {
        queryAll(themeButtonSelector).forEach(function (button) {
            button.addEventListener("click", function () {
                updateTheme(button.dataset.theme || "auto");
                button.classList.add("clicked");
                window.setTimeout(function () {
                    button.classList.remove("clicked");
                }, 200);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        initMenu();
        initThemeButtons();
        document.body.classList.add("modern-color-ready");
    });
})();
