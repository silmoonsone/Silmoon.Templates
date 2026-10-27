(function () {
    if (window.silmoonDropdownSelectLoaded) return;
    window.silmoonDropdownSelectLoaded = true;
    const selector = "details[data-dropdown-select]";
    const tracking = new WeakSet();

    function closeMenu(root) {
        root.open = false;
        const menu = root.querySelector(".dropdown-select-options");
        if (typeof menu?.hidePopover === "function" && menu.matches(":popover-open")) menu.hidePopover();
    }

    function closeOthers(current) {
        document.querySelectorAll(`${selector}[open]`).forEach(item => {
            if (item !== current) closeMenu(item);
        });
    }

    function trackPosition(root) {
        if (tracking.has(root) || typeof root.querySelector(".dropdown-select-options")?.showPopover !== "function") return;
        tracking.add(root);
        let previous = "";
        function update() {
            if (!root.isConnected || !root.open) { tracking.delete(root); return; }
            const bounds = root.getBoundingClientRect();
            const position = `${bounds.left},${bounds.top},${bounds.width},${bounds.height}`;
            if (position !== previous) { placeMenu(root); previous = position; }
            requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    function openMenu(root) {
        if (root.dataset.disabled === "true") { closeMenu(root); return; }
        closeOthers(root);
        placeMenu(root);
        trackPosition(root);
    }

    function placeMenu(root) {
        const menu = root.querySelector(".dropdown-select-options");
        if (!menu) return;
        const usePopover = typeof menu.showPopover === "function";
        if (usePopover) {
            menu.style.position = "fixed";
            menu.style.inset = "auto";
            menu.style.margin = "0";
            if (!menu.matches(":popover-open")) menu.showPopover();
        }
        menu.style.translate = "none";
        menu.style.maxHeight = "";
        const bounds = root.getBoundingClientRect();
        const viewport = document.documentElement;
        const above = Math.max(0, bounds.top - 16);
        const below = Math.max(0, viewport.clientHeight - bounds.bottom - 16);
        const height = menu.getBoundingClientRect().height;
        let upward = root.dataset.openUpward === "true";
        if (upward && height > above && below > above) upward = false;
        else if (!upward && height > below && above > below) upward = true;
        root.dataset.placement = upward ? "above" : "below";
        menu.style.maxHeight = `min(18rem, ${upward ? above : below}px)`;
        const position = menu.getBoundingClientRect();
        if (usePopover) {
            const left = getComputedStyle(root).direction === "rtl" ? bounds.left : bounds.right - position.width;
            menu.style.left = `${Math.max(8, Math.min(left, viewport.clientWidth - position.width - 8))}px`;
            menu.style.top = `${upward ? bounds.top - position.height - 8 : bounds.bottom + 8}px`;
            return;
        }
        const offset = Math.max(0, 8 - position.left) - Math.max(0, position.right - viewport.clientWidth + 8);
        menu.style.translate = `${offset}px 0`;
    }

    document.addEventListener("toggle", event => {
        const root = event.target;
        if (!root.matches?.(selector)) return;
        if (!root.open) { closeMenu(root); return; }
        openMenu(root);
    }, true);

    document.addEventListener("pointerdown", event => closeOthers(event.target.closest?.(selector)), true);
    document.addEventListener("focusin", event => closeOthers(event.target.closest?.(selector)));
    document.addEventListener("click", event => {
        const root = event.target.closest?.(selector);
        if (!root) return;
        if (root.dataset.disabled === "true") { event.preventDefault(); return; }
        const option = event.target.closest("[data-dropdown-option]");
        if (!option || option.disabled) return;
        closeMenu(root);
        if (option.tagName === "BUTTON") root.querySelector("summary").focus();
    });

    document.addEventListener("keydown", event => {
        const root = event.target.closest?.(selector);
        if (!root || root.dataset.disabled === "true") return;
        const trigger = root.querySelector("summary");
        if (event.key === "Escape" && root.open) {
            event.preventDefault();
            event.stopPropagation();
            closeMenu(root);
            trigger.focus();
            return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || (!root.open && event.target !== trigger)) return;
        const options = [...root.querySelectorAll("[data-dropdown-option]:not(:disabled)")];
        if (!options.length) return;
        event.preventDefault();
        root.open = true;
        closeOthers(root);
        placeMenu(root);
        const index = options.indexOf(document.activeElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : index < 0 ? (event.key === "ArrowUp" ? options.length - 1 : 0) : (index + (event.key === "ArrowUp" ? -1 : 1) + options.length) % options.length;
        options[next].focus();
    });

    window.addEventListener("resize", () => closeOthers(null));
    document.addEventListener("scroll", event => {
        if (!event.target.closest?.(".dropdown-select-options")) closeOthers(null);
    }, true);

    // A user may open native details before this lazy module finishes loading.
    document.querySelectorAll(`${selector}[open]`).forEach(root => {
        if (root.open) openMenu(root);
    });
})();
