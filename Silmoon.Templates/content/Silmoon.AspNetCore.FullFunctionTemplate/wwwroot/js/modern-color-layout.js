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
    const runtimeCleanup = [];
    let runtimeAttached = false;
    let menuBinding = null;
    let backToTopBinding = null;
    let layoutFrame = null;
    let enhancedLoadAttached = false;

    function queryAll(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function listen(cleanup, target, name, handler, options) {
        target.addEventListener(name, handler, options);
        cleanup.push(function () { target.removeEventListener(name, handler, options); });
    }

    function setStyle(element, name, value) {
        if (element.style.getPropertyValue(name) === value) return;
        if (value) element.style.setProperty(name, value);
        else element.style.removeProperty(name);
    }

    function numberStyle(styles, name, fallback) {
        const value = parseFloat(styles.getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
    }

    function updateViewport() {
        if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
        layoutFrame = null;
        // Finish geometry reads before either control writes layout or visibility.
        const menuState = menuBinding ? menuBinding.measure() : null;
        const showBackToTop = window.scrollY > Math.max(window.innerHeight, 480);
        if (menuBinding) menuBinding.apply(menuState);
        if (backToTopBinding) backToTopBinding.button.classList.toggle("visible", showBackToTop);
    }

    function scheduleViewport() {
        if (layoutFrame === null) layoutFrame = window.requestAnimationFrame(updateViewport);
    }

    function setThemeAttribute(theme) {
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        } else if (theme === "light") {
            document.documentElement.setAttribute("data-theme", "light");
        } else {
            const systemPrefersDark = window.matchMedia && window.matchMedia(darkSchemeQuery).matches;
            if (systemPrefersDark) document.documentElement.setAttribute("data-theme", "dark");
            else document.documentElement.removeAttribute("data-theme");
        }
    }

    function applyTheme(theme) {
        setThemeAttribute(theme);
        queryAll(themeButtonSelector).forEach(function (button) {
            const active = button.dataset.theme === theme;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    function updateTheme(theme) {
        if (theme === "auto") localStorage.removeItem(themeStorageKey);
        else localStorage.setItem(themeStorageKey, theme);
        applyTheme(theme);
        scheduleViewport();
    }

    function initRuntime() {
        if (runtimeAttached) return;
        runtimeAttached = true;
        listen(runtimeCleanup, window, "scroll", scheduleViewport, { passive: true });
        listen(runtimeCleanup, window, "resize", scheduleViewport);
        if (window.visualViewport) {
            listen(runtimeCleanup, window.visualViewport, "resize", scheduleViewport);
            listen(runtimeCleanup, window.visualViewport, "scroll", scheduleViewport, { passive: true });
        }
        if (window.matchMedia) {
            listen(runtimeCleanup, window.matchMedia(darkSchemeQuery), "change", function () {
                if (!localStorage.getItem(themeStorageKey)) updateTheme("auto");
            });
        }
        listen(runtimeCleanup, document, "click", function (event) {
            const button = event.target.closest(themeButtonSelector);
            if (!button) return;
            updateTheme(button.dataset.theme || "auto");
            button.classList.add("clicked");
            window.setTimeout(function () { button.classList.remove("clicked"); }, 200);
        });
    }

    function initMenu() {
        // A portaled menu can outlive the fragment that originally owned it.
        if (menuBinding && menuBinding.isStale()) {
            menuBinding.dispose(true);
            menuBinding = null;
        }
        const menu = document.getElementById("menu");
        const toggleMenu = document.getElementById("toggle-menu");
        if (menuBinding && menuBinding.menu === menu && menuBinding.toggleMenu === toggleMenu) {
            menuBinding.place();
            return;
        }
        if (menuBinding) menuBinding.dispose(true);
        menuBinding = null;
        if (!menu || !toggleMenu) return;

        const desktopParent = menu.parentElement;
        const desktopNextSibling = menu.nextSibling;
        const mobileQuery = window.matchMedia("(max-width: 768px)");
        const menuRegion = desktopParent.classList.contains("modern-color-menu-region") ? desktopParent : null;
        const cleanup = [];

        function closeMenu() {
            menu.classList.remove("open");
            toggleMenu.setAttribute("aria-expanded", "false");
        }

        function restoreMenu() {
            const sibling = desktopNextSibling && desktopNextSibling.parentElement === desktopParent ? desktopNextSibling : null;
            desktopParent.insertBefore(menu, sibling);
        }

        function place() {
            if (mobileQuery.matches) {
                if (menu.parentElement !== document.body) document.body.appendChild(menu);
            } else {
                if (menu.parentElement !== desktopParent) restoreMenu();
                setStyle(menu, "top", "");
            }
        }

        function measure() {
            if (mobileQuery.matches) {
                const rootStyles = window.getComputedStyle(document.documentElement);
                const gap = numberStyle(rootStyles, "--mobile-menu-gap", 10);
                const edge = numberStyle(rootStyles, "--mobile-edge-offset", 20);
                const viewport = window.visualViewport;
                const visibleTop = viewport ? Math.max(0, viewport.offsetTop) : 0;
                const visibleBottom = viewport ? visibleTop + viewport.height : window.innerHeight;
                const top = Math.round(Math.max(toggleMenu.getBoundingClientRect().bottom + gap, visibleTop + gap));
                return { mobile: true, top: top, height: Math.max(0, visibleBottom - top - edge) };
            }
            if (!menuRegion) return { mobile: false, height: null };
            const top = parseFloat(window.getComputedStyle(menu).top) || 0;
            const bottomGap = parseFloat(window.getComputedStyle(document.body).paddingBottom) || 0;
            return { mobile: false, height: Math.max(0, Math.min(window.innerHeight - top - bottomGap, menuRegion.getBoundingClientRect().bottom - top)) };
        }

        function apply(state) {
            setStyle(menu, "--modern-color-menu-height", !state.mobile && state.height !== null ? state.height + "px" : "");
            setStyle(menu, "--modern-color-mobile-menu-height", state.mobile ? state.height + "px" : "");
            if (state.mobile) setStyle(menu, "top", state.top + "px");
        }

        closeMenu();
        listen(cleanup, toggleMenu, "click", function (event) {
            event.stopPropagation();
            place();
            const isOpen = menu.classList.toggle("open");
            toggleMenu.setAttribute("aria-expanded", isOpen ? "true" : "false");
            updateViewport();
            if (isOpen) menu.scrollTop = 0;
        });
        listen(cleanup, menu, "click", function (event) {
            const submenuToggle = event.target.closest(".menu-submenu-toggle");
            if (submenuToggle && menu.contains(submenuToggle)) {
                event.preventDefault();
                event.stopPropagation();
                setSubmenuExpanded(submenuToggle, submenuToggle.getAttribute("aria-expanded") !== "true");
                return;
            }
            const link = event.target.closest("a");
            if (!link || !menu.contains(link)) return;
            queryAll("a", menu).forEach(function (item) { item.classList.remove("active"); });
            link.classList.add("active");
            syncActiveSubmenus(menu, link);
            closeMenu();
        });
        listen(cleanup, document, "click", function (event) {
            if (!event.target.closest("#menu, #toggle-menu")) closeMenu();
        });
        listen(cleanup, document, "keydown", function (event) {
            if (event.key === "Escape") closeMenu();
        });
        listen(cleanup, mobileQuery, "change", function () {
            closeMenu();
            place();
            updateViewport();
        });
        listen(cleanup, window, "hashchange", function () {
            syncActiveSubmenus(menu, syncHashActiveLink(menu));
        });
        if (window.ResizeObserver) {
            const observer = new window.ResizeObserver(scheduleViewport);
            if (menuRegion) observer.observe(menuRegion);
            observer.observe(toggleMenu);
            cleanup.push(function () { observer.disconnect(); });
        }
        menuBinding = {
            menu: menu,
            toggleMenu: toggleMenu,
            place: place,
            measure: measure,
            apply: apply,
            isStale: function () {
                return !document.documentElement.contains(desktopParent)
                    || !document.documentElement.contains(toggleMenu)
                    || !document.documentElement.contains(menu)
                    || (menu.parentElement === document.body && desktopParent !== document.body && queryAll("#menu").some(function (item) { return item !== menu; }));
            },
            dispose: function (removePortal) {
                cleanup.forEach(function (remove) { remove(); });
                closeMenu();
                if (menu.parentElement === document.body && desktopParent !== document.body) {
                    if (!removePortal && document.documentElement.contains(desktopParent)) restoreMenu();
                    else menu.remove();
                }
                setStyle(menu, "top", "");
                setStyle(menu, "--modern-color-menu-height", "");
                setStyle(menu, "--modern-color-mobile-menu-height", "");
            }
        };
        place();
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
        return activeLink;
    }

    function syncActiveSubmenus(menu, activeLink) {
        queryAll(".menu-submenu-toggle", menu).forEach(function (toggle) {
            const submenu = getSubmenu(toggle);
            const hasActiveChild = !!(submenu && (activeLink ? submenu.contains(activeLink) : submenu.querySelector(".menu-item.active, [aria-current='page']")));
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

        syncActiveSubmenus(menu, syncHashActiveLink(menu));
    }

    function initLayoutPlacement() {
        const wrapper = document.querySelector(".content-wrapper");
        const themeToggleGroup = document.querySelector(".theme-toggle-group");
        // Compatibility for older hosts; new layouts render the group here directly.
        if (wrapper && themeToggleGroup && themeToggleGroup.parentElement !== wrapper) wrapper.appendChild(themeToggleGroup);
    }

    function initBackToTop() {
        let button = document.querySelector(".back-to-top");
        if (!backToTopBinding || backToTopBinding.button !== button) {
            if (backToTopBinding) backToTopBinding.dispose();
            const created = !button;
            if (created) {
                button = document.createElement("button");
                button.className = "back-to-top";
                button.type = "button";
                button.innerHTML = '<i class="bi bi-arrow-up"></i>';
                document.body.appendChild(button);
            }
            const goToTop = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };
            button.addEventListener("click", goToTop);
            backToTopBinding = {
                button: button,
                dispose: function () {
                    button.removeEventListener("click", goToTop);
                    button.classList.remove("visible");
                    if (created) button.remove();
                }
            };
        }
        const label = document.querySelector("[data-back-to-top-label]")?.dataset.backToTopLabel || "回到顶部";
        button.title = label;
        button.setAttribute("aria-label", label);
    }

    function dispose() {
        if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
        layoutFrame = null;
        runtimeCleanup.splice(0).forEach(function (remove) { remove(); });
        runtimeAttached = false;
        if (menuBinding) menuBinding.dispose(false);
        if (backToTopBinding) backToTopBinding.dispose();
        menuBinding = null;
        backToTopBinding = null;
    }

    function refresh() {
        initLayoutPlacement();
        initRuntime();
        applyTheme(localStorage.getItem(themeStorageKey) || "auto");
        initMenu();
        initSubmenus();
        initBackToTop();
        updateViewport();
        document.body.classList.add("modern-color-ready");
    }

    function refreshBlazor() {
        if (document.querySelector("#content > .content-wrapper, .trading-layout")) refresh();
        else dispose();
    }

    function initBlazor() {
        refreshBlazor();
        if (enhancedLoadAttached || !window.Blazor || typeof window.Blazor.addEventListener !== "function") return;
        // Keep this page-level hook when leaving a layout so navigation back can restore it.
        window.Blazor.addEventListener("enhancedload", refreshBlazor);
        enhancedLoadAttached = true;
    }

    window.ModernColorLayout = window.ModernColorLayout || {};
    window.ModernColorLayout.init = refresh;
    window.ModernColorLayout.refresh = refresh;
    window.ModernColorLayout.dispose = dispose;
    window.ModernColorLayout.initBlazor = initBlazor;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
    else refresh();
})();
