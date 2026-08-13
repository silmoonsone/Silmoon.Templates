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

        const desktopParent = menu.parentElement;
        const desktopNextSibling = menu.nextSibling;
        const mobileQuery = window.matchMedia("(max-width: 768px)");

        function placeMenuForViewport() {
            if (mobileQuery.matches) {
                if (menu.parentElement !== document.body) {
                    document.body.appendChild(menu);
                }
            } else if (menu.parentElement !== desktopParent) {
                desktopParent.insertBefore(menu, desktopNextSibling);
            }
        }

        function closeMenu() {
            menu.classList.remove("open");
            toggleMenu.setAttribute("aria-expanded", "false");
        }

        function openOrCloseMenu() {
            placeMenuForViewport();
            const isOpen = menu.classList.toggle("open");
            toggleMenu.setAttribute("aria-expanded", isOpen ? "true" : "false");
            if (isOpen) {
                menu.scrollTop = 0;
                window.setTimeout(function () {
                    menu.scrollTop = 0;
                }, 0);
            }
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

        mobileQuery.addEventListener("change", function () {
            closeMenu();
            placeMenuForViewport();
        });
        placeMenuForViewport();
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

    function initLayoutPlacement() {
        const wrapper = document.querySelector(".content-wrapper");
        const themeToggleGroup = document.querySelector(".theme-toggle-group");

        if (wrapper && themeToggleGroup && themeToggleGroup.parentElement !== wrapper) {
            wrapper.appendChild(themeToggleGroup);
        }
    }

    function initBackToTop() {
        let button = document.querySelector(".back-to-top");

        if (!button) {
            button = document.createElement("button");
            button.className = "back-to-top";
            button.type = "button";
            button.title = "回到顶部";
            button.setAttribute("aria-label", "回到顶部");
            button.innerHTML = '<i class="bi bi-arrow-up"></i>';
            document.body.appendChild(button);
        }

        function updateButtonState() {
            const threshold = Math.max(window.innerHeight, 480);
            button.classList.toggle("visible", window.scrollY > threshold);
        }

        button.addEventListener("click", function () {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        });

        window.addEventListener("scroll", updateButtonState, { passive: true });
        window.addEventListener("resize", updateButtonState);
        updateButtonState();
    }

    document.addEventListener("DOMContentLoaded", function () {
        initLayoutPlacement();
        initTheme();
        initMenu();
        initThemeButtons();
        initBackToTop();
        document.body.classList.add("modern-color-ready");
    });
})();
