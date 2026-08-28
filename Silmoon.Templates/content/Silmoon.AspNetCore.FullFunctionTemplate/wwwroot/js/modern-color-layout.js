/*
 * Modern Color Layout
 * Extracted from Silmoon.AspNetCore.FullFunctionTemplate for standalone HTML use.
 * Requires only standard browser APIs. Bootstrap JS is optional and only needed
 * for Bootstrap components such as tabs, dropdowns, and modals.
 */

(function () {
    const themeStorageKey = "modern-color-layout-theme";
    const submenuExpandedState = new Map();
    const themeButtonSelector = ".theme-btn, .theme-menu-btn";
    const darkSchemeQuery = "(prefers-color-scheme: dark)";
    let themeWatcherAttached = false;
    let menuBinding = null;

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

        if (window.matchMedia && !themeWatcherAttached) {
            window.matchMedia(darkSchemeQuery).addEventListener("change", function () {
                if (!localStorage.getItem(themeStorageKey)) {
                    updateTheme("auto");
                }
            });
            themeWatcherAttached = true;
        }
    }

    function initMenu() {
        const menu = document.getElementById("menu");
        const toggleMenu = document.getElementById("toggle-menu");

        if (!menu || !toggleMenu) {
            if (menuBinding) menuBinding.dispose();
            menuBinding = null;
            return;
        }
        if (menuBinding && menuBinding.menu === menu && menuBinding.toggleMenu === toggleMenu) return;
        if (menuBinding) menuBinding.dispose();

        const desktopParent = menu.parentElement;
        const desktopNextSibling = menu.nextSibling;
        const mobileQuery = window.matchMedia("(max-width: 768px)");
        const cleanupCallbacks = [];

        function listen(target, eventName, listener) {
            target.addEventListener(eventName, listener);
            cleanupCallbacks.push(function () {
                target.removeEventListener(eventName, listener);
            });
        }

        function updateMobileMenuPosition() {
            const rootStyles = window.getComputedStyle(document.documentElement);
            const gap = parseFloat(rootStyles.getPropertyValue("--mobile-menu-gap")) || 10;
            const buttonRect = toggleMenu.getBoundingClientRect();
            menu.style.top = Math.round(buttonRect.bottom + gap) + "px";
        }

        function placeMenuForViewport() {
            if (mobileQuery.matches) {
                if (menu.parentElement !== document.body) {
                    document.body.appendChild(menu);
                }
                updateMobileMenuPosition();
            } else if (menu.parentElement !== desktopParent) {
                desktopParent.insertBefore(menu, desktopNextSibling);
                menu.style.top = "";
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

        listen(toggleMenu, "click", function (event) {
            event.stopPropagation();
            openOrCloseMenu();
        });

        listen(menu, "click", function (event) {
            const submenuToggle = event.target.closest(".menu-submenu-toggle");
            if (submenuToggle && menu.contains(submenuToggle)) {
                event.preventDefault();
                event.stopPropagation();
                setSubmenuExpanded(submenuToggle, submenuToggle.getAttribute("aria-expanded") !== "true");
                return;
            }

            const link = event.target.closest("a");
            if (!link || !menu.contains(link)) return;

            queryAll("a", menu).forEach(function (item) {
                item.classList.remove("active");
            });
            link.classList.add("active");
            syncActiveSubmenus(menu);
            closeMenu();
        });

        listen(document, "click", function (event) {
            if (!event.target.closest("#menu, #toggle-menu")) {
                closeMenu();
            }
        });

        listen(document, "keydown", function (event) {
            if (event.key === "Escape") {
                closeMenu();
            }
        });

        listen(mobileQuery, "change", function () {
            closeMenu();
            placeMenuForViewport();
        });
        listen(window, "hashchange", function () {
            syncHashActiveLink(menu);
            syncActiveSubmenus(menu);
        });
        listen(window, "resize", function () {
            if (mobileQuery.matches) updateMobileMenuPosition();
        });
        placeMenuForViewport();
        menuBinding = {
            menu: menu,
            toggleMenu: toggleMenu,
            dispose: function () {
                cleanupCallbacks.forEach(function (cleanup) {
                    cleanup();
                });
            }
        };
        menu.dataset.modernColorMenuInitialized = "true";
    }

    function getSubmenu(toggle) {
        const controls = toggle.getAttribute("aria-controls");
        if (controls) {
            const submenu = document.getElementById(controls);
            if (submenu) return submenu;
        }

        const sibling = toggle.nextElementSibling;
        if (sibling && sibling.classList.contains("menu-submenu")) return sibling;
        return null;
    }

    function setSubmenuExpanded(toggle, expanded) {
        const submenu = getSubmenu(toggle);
        if (!submenu) return;

        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        submenu.classList.toggle("open", expanded);
        if (submenu.id) submenuExpandedState.set(submenu.id, expanded);
    }

    function syncHashActiveLink(menu) {
        if (!window.location.hash) return;

        const activeLink = queryAll("a", menu).find(function (link) {
            return link.getAttribute("href") === window.location.hash;
        });
        if (!activeLink) return;

        queryAll("a", menu).forEach(function (item) {
            item.classList.remove("active");
        });
        activeLink.classList.add("active");
    }

    function syncActiveSubmenus(menu) {
        queryAll(".menu-submenu-toggle", menu).forEach(function (toggle) {
            const submenu = getSubmenu(toggle);
            const hasActiveChild = !!(submenu && submenu.querySelector(".menu-item.active, [aria-current='page']"));
            toggle.classList.toggle("child-active", hasActiveChild);
            if (hasActiveChild) setSubmenuExpanded(toggle, true);
        });
    }

    function initSubmenus() {
        const menu = document.getElementById("menu");
        if (!menu) return;

        queryAll(".menu-submenu-toggle", menu).forEach(function (toggle) {
            const submenu = getSubmenu(toggle);
            if (!submenu) return;

            if (!submenu.id) {
                submenu.id = "menu-submenu-" + Math.random().toString(36).slice(2, 10);
            }

            toggle.setAttribute("aria-controls", submenu.id);
            if (!toggle.hasAttribute("aria-expanded")) {
                const storedState = submenuExpandedState.get(submenu.id);
                setSubmenuExpanded(toggle, storedState === undefined ? submenu.classList.contains("open") : storedState);
            }
        });

        syncHashActiveLink(menu);
        syncActiveSubmenus(menu);
    }

    function initThemeButtons() {
        queryAll(themeButtonSelector).forEach(function (button) {
            if (button.dataset.modernColorThemeInitialized === "true") return;
            button.addEventListener("click", function () {
                updateTheme(button.dataset.theme || "auto");
                button.classList.add("clicked");
                window.setTimeout(function () {
                    button.classList.remove("clicked");
                }, 200);
            });
            button.dataset.modernColorThemeInitialized = "true";
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
        if (button.dataset.modernColorBackToTopInitialized === "true") return;

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
        button.dataset.modernColorBackToTopInitialized = "true";
    }

    function refresh() {
        initLayoutPlacement();
        initTheme();
        initSubmenus();
        initMenu();
        initThemeButtons();
        initBackToTop();
        document.body.classList.add("modern-color-ready");
    }

    window.ModernColorLayout = window.ModernColorLayout || {};
    window.ModernColorLayout.init = refresh;
    window.ModernColorLayout.refresh = refresh;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
    else refresh();
})();
