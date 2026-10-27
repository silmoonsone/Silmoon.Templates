"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const componentsRoot = process.env.FFWEB_COMPONENTS_ROOT || path.join(__dirname, "..", "..", "Silmoon.Templates", "content", "Silmoon.AspNetCore.FullFunctionTemplate", "Components");
const scriptPath = path.join(componentsRoot, "DropdownMenu.razor.js");
const source = fs.readFileSync(scriptPath, "utf8");

function fixture({ reducedMotion = false, autoLoad = true, popover = true } = {}) {
    class Target {
        constructor() { this.listeners = new Map(); }
        addEventListener(type, listener) {
            if (!this.listeners.has(type)) this.listeners.set(type, new Set());
            this.listeners.get(type).add(listener);
        }
        removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
        emit(type, target, key, detail = {}) {
            const event = { target, key, ...detail, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
            for (const listener of this.listeners.get(type) || []) listener(event);
            return event;
        }
        counts() { return Object.fromEntries([...this.listeners].map(([type, listeners]) => [type, listeners.size])); }
    }
    const document = new Target();
    const animations = [];
    const frames = new Map();
    const topLayer = new Set();
    let frameId = 0;
    class Element extends Target {
        constructor(attributes = {}) {
            super();
            this.attributes = new Map();
            this.dataset = {};
            this.children = [];
            this.parentElement = null;
            this.tagName = "DIV";
            this.rect = null;
            this.hidden = false;
            this.inert = false;
            this.disabled = false;
            this._scrollTop = 0;
            this.clientTop = 0;
            this.style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
            this.classes = new Set();
            this.classList = { add: (...names) => names.forEach(name => this.classes.add(name)), remove: (...names) => names.forEach(name => this.classes.delete(name)), contains: name => this.classes.has(name), toggle: (name, force) => { const present = force ?? !this.classes.has(name); if (present) this.classes.add(name); else this.classes.delete(name); return present; } };
            for (const [name, value] of Object.entries(attributes)) this.setAttribute(name, value);
        }
        get isConnected() { return this === document.documentElement || this.parentElement?.isConnected === true; }
        setAttribute(name, value) {
            this.attributes.set(name, String(value));
            if (name === "class") this.classes = new Set(String(value).split(/\s+/));
            if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
        }
        getAttribute(name) { return this.attributes.get(name) ?? null; }
        removeAttribute(name) {
            this.attributes.delete(name);
            if (name.startsWith("data-")) delete this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())];
        }
        hasAttribute(name) { return this.attributes.has(name); }
        append(child) { child.remove(); child.parentElement = this; this.children.push(child); return child; }
        remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
        contains(target) { return target === this || this.children.some(child => child.contains(target)); }
        matches(selector) {
            if (selector === ":popover-open") return topLayer.has(this);
            if (selector === ":disabled") return this.disabled;
            let excluded = false;
            selector = selector.replace(/:not\(([^)]+)\)/g, (_, part) => { if (part === ":disabled" ? this.disabled : this.matches(part)) excluded = true; return ""; });
            if (excluded) return false;
            let matches = true;
            selector = selector.replace(/\[([^=\]]+)(?:=['"]([^'"]*)['"])?\]/g, (_, name, value) => { if (value === undefined ? !this.hasAttribute(name) : this.getAttribute(name) !== value) matches = false; return ""; });
            selector = selector.replace(/\.([\w-]+)/g, (_, name) => { if (!this.classes.has(name)) matches = false; return ""; });
            return matches && (selector === "" || selector === "*" || selector.toUpperCase() === this.tagName);
        }
        closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
        querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        focus() { document.activeElement = this; }
        getBoundingClientRect() {
            if (this.classes.has("dropdown-item")) {
                const menu = this.closest(".dropdown-menu-popup");
                const bounds = menu.getBoundingClientRect();
                const item = this.rect ?? { left: 0, top: this.parentElement.children.indexOf(this) * 40, width: bounds.width, height: 40 };
                const left = bounds.left + item.left;
                const top = bounds.top + item.top - menu.scrollTop;
                return { left, top, width: item.width, height: item.height, right: left + item.width, bottom: top + item.height };
            }
            const natural = this.rect ?? { left: 0, top: 0, width: 240, height: this.children.length * 40 };
            const limit = value => value ? Math.min(...(value.match(/\d+(?:\.\d+)?(?=px)/g) || [Infinity]).map(Number)) : Infinity;
            const width = Math.min(parseFloat(this.style.width) || natural.width, limit(this.style.maxWidth));
            const height = Math.min(parseFloat(this.style.height) || natural.height, limit(this.style.maxHeight));
            const origin = this.style.position === "absolute" ? this.parentElement.getBoundingClientRect() : { left: 0, top: 0 };
            const left = this.style.left ? parseFloat(this.style.left) + origin.left : natural.left;
            const top = this.style.top ? parseFloat(this.style.top) + origin.top : natural.top;
            return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
        }
        get clientWidth() { return this.getBoundingClientRect().width; }
        get clientHeight() { return this.getBoundingClientRect().height; }
        get offsetWidth() { return this.clientWidth; }
        get offsetHeight() { return this.clientHeight; }
        get scrollHeight() { return this.rect?.height ?? this.children.length * 40; }
        get scrollTop() { return this._scrollTop; }
        set scrollTop(value) { this._scrollTop = Math.max(0, Math.min(value, Math.max(0, this.scrollHeight - this.clientHeight))); }
        showPopover() { assert.equal(this.isConnected, true, "Only connected elements may enter the top layer."); topLayer.add(this); }
        hidePopover() { topLayer.delete(this); }
        animate() {
            let resolve, reject;
            const animation = { element: this, cancelled: false, finished: new Promise((yes, no) => { resolve = yes; reject = no; }), finish() { resolve(); }, cancel() { this.cancelled = true; reject(new Error("Animation cancelled")); } };
            animation.finished.catch(() => {});
            animations.push(animation);
            return animation;
        }
    }
    document.documentElement = new Element();
    document.documentElement.rect = { left: 0, top: 0, width: 800, height: 600 };
    document.body = document.documentElement.append(new Element());
    document.querySelectorAll = selector => document.documentElement.querySelectorAll(selector);
    document.querySelector = selector => document.querySelectorAll(selector)[0] || null;
    const types = new Map();
    const instances = new Map();
    const window = new Target();
    window.innerWidth = 800;
    window.innerHeight = 600;
    window.visualViewport = Object.assign(new Target(), { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 });
    window.matchMedia = () => ({ matches: reducedMotion });
    window.bootstrap = { Dropdown: { getInstance: toggle => instances.get(toggle) || null } };
    const requestAnimationFrame = callback => { const id = ++frameId; frames.set(id, callback); return id; };
    const cancelAnimationFrame = id => frames.delete(id);
    window.requestAnimationFrame = requestAnimationFrame;
    window.cancelAnimationFrame = cancelAnimationFrame;
    const context = vm.createContext({ window, document, HTMLElement: Element, requestAnimationFrame, cancelAnimationFrame,
        getComputedStyle: element => ({ direction: element.direction || "ltr" }),
        customElements: { get: name => types.get(name), define(name, type) {
            types.set(name, type);
            document.querySelectorAll(name).forEach(element => { Object.setPrototypeOf(element, type.prototype); element.connectedCallback?.(); });
        } }
    });
    const load = () => vm.runInContext(source, context, { filename: scriptPath });

    function install(menu) {
        document.body.append(menu.root);
        const instance = { updates: 0, disposed: false, preventHide: false, update() { this.updates++; },
            show() {
                if (menu.toggle.disabled) return;
                menu.popup.classList.add("show");
                menu.toggle.classList.add("show");
                menu.toggle.setAttribute("aria-expanded", "true");
                document.emit("shown.bs.dropdown", menu.toggle);
            },
            hide() {
                if (menu.toggle.disabled || this.preventHide) return;
                menu.popup.classList.remove("show");
                menu.toggle.classList.remove("show");
                menu.toggle.setAttribute("aria-expanded", "false");
                document.emit("hidden.bs.dropdown", menu.toggle);
            }, dispose() { this.disposed = true; instances.delete(menu.toggle); } };
        instances.set(menu.toggle, instance);
        menu.root.connectedCallback?.();
        return instance;
    }
    function menu({ alignEnd = false, openUpward = false, direction = "ltr", open = true, rect = { left: 100, top: 100, width: 80, height: 32 }, height = 180 } = {}) {
        const root = new (types.get("silmoon-dropdown-menu") || Element)();
        root.tagName = "SILMOON-DROPDOWN-MENU";
        root.rect = { ...rect };
        root.direction = direction;
        root.setAttribute("data-dropdown-menu", "");
        root.setAttribute("data-align-end", String(alignEnd));
        root.setAttribute("data-open-upward", String(openUpward));
        const toggle = root.append(new Element({ "data-bs-toggle": "dropdown", "data-bs-display": "static", "aria-expanded": "false" }));
        toggle.tagName = "BUTTON";
        toggle.rect = root.rect;
        const popup = root.append(new Element({ class: "dropdown-menu dropdown-menu-popup", popover: "manual" }));
        popup.rect = { left: 0, top: 0, width: 240, height };
        if (!popover) { popup.showPopover = undefined; popup.hidePopover = undefined; }
        const viewport = popup.append(new Element({ class: "dropdown-menu-viewport" }));
        const panel = name => { const element = viewport.append(new Element({ "data-dropdown-menu-panel": name })); element.hidden = name !== "root"; return element; };
        const option = (parent, attributes = {}) => parent.append(new Element({ class: "dropdown-item", ...attributes }));
        const home = panel("root"), child = panel("root-0"), deep = panel("root-0-2"), other = panel("root-1");
        const enter = option(home, { "data-dropdown-menu-open": "root-0" });
        const enterOther = option(home, { "data-dropdown-menu-open": "root-1" });
        const rootCommand = option(home, { "data-dropdown-menu-item": "" });
        const back = option(child, { "data-dropdown-menu-back": "root" });
        const command = option(child, { "data-dropdown-menu-item": "" });
        const disabled = option(child, { "data-dropdown-menu-item": "" });
        disabled.disabled = true;
        const enterDeep = option(child, { "data-dropdown-menu-open": "root-0-2" });
        const deepBack = option(deep, { "data-dropdown-menu-back": "root-0" });
        const deepCommand = option(deep, { "data-dropdown-menu-item": "" });
        option(other, { "data-dropdown-menu-back": "root" });
        const result = { root, toggle, popup, viewport, home, child, deep, other, enter, enterOther, rootCommand, back, command, disabled, enterDeep, deepBack, deepCommand };
        result.instance = install(result);
        if (open) result.instance.show();
        return result;
    }
    if (autoLoad) load();
    return { document, window, animations, menu, frames, topLayer, load,
        click: target => document.emit("click", target), key: (target, key) => window.emit("keydown", target, key),
        close: menu => menu.instance.hide(), disconnect: menu => { menu.root.remove(); menu.root.disconnectedCallback(); },
        remount: menu => { menu.instance = install(menu); menu.instance.show(); },
        flushFrame() { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } },
        viewport(width, height) { window.innerWidth = document.documentElement.rect.width = window.visualViewport.width = width; window.innerHeight = document.documentElement.rect.height = window.visualViewport.height = height; }
    };
}

async function settle(animations) {
    animations.forEach(animation => animation.finish());
    await new Promise(setImmediate);
}

test("a completed transition leaves only its destination usable", async () => {
    const page = fixture();
    const menu = page.menu();
    page.click(menu.enter);
    assert.equal(menu.enter.classList.contains("is-navigating"), true);
    assert.equal(menu.home.inert, true);
    assert.equal(menu.child.hidden, false);
    assert.equal(page.document.activeElement, menu.back);
    await settle([...page.animations]);
    assert.equal(menu.home.hidden, true);
    assert.equal(menu.home.inert, false);
    assert.equal(menu.child.hidden, false);
    assert.equal(menu.enter.classList.contains("is-navigating"), false);
});

test("a queued forward completion cannot hide the panel selected by a rapid return", async () => {
    const page = fixture();
    const menu = page.menu();
    page.click(menu.enter);
    const forward = [...page.animations];
    forward.forEach(animation => animation.finish());
    page.click(menu.back);
    const returning = page.animations.slice(forward.length);
    await new Promise(setImmediate);
    assert.equal(menu.home.hidden, false);
    assert.equal(menu.child.inert, true);
    assert.equal(page.document.activeElement, menu.enter);
    await settle(returning);
    assert.equal(menu.home.hidden, false);
    assert.equal(menu.child.hidden, true);
    assert.equal(menu.child.inert, false);
});

test("closing and reopening during animation discards stale completions", async () => {
    const page = fixture();
    const menu = page.menu();
    page.click(menu.enter);
    const old = [...page.animations];
    page.close(menu);
    assert.equal(menu.home.hidden, false);
    assert.equal(menu.child.hidden, true);
    assert.equal(menu.home.inert, false);
    menu.popup.classList.add("show");
    page.click(menu.enterOther);
    await settle(old);
    assert.equal(menu.other.hidden, false);
    assert.equal(menu.home.inert, true);
    await settle(page.animations.slice(old.length));
    assert.equal(menu.home.hidden, true);
    assert.equal(menu.other.hidden, false);
});

test("disconnect cancels transition and highlight work before the same element is remounted", async () => {
    const page = fixture();
    const menu = page.menu();
    page.click(menu.enter);
    await settle([...page.animations]);
    page.click(menu.back);
    await settle([...page.animations]);
    assert.equal(menu.enter.classList.contains("is-returning"), true);
    const previousInstance = menu.instance;
    page.disconnect(menu);
    assert.equal(previousInstance.disposed, true);
    assert.equal(menu.enter.classList.contains("is-returning"), false);
    assert.equal(menu.home.hidden, false);
    assert.equal(menu.child.hidden, true);
    page.remount(menu);
    page.click(menu.enter);
    const pending = [...page.animations];
    page.disconnect(menu);
    page.remount(menu);
    page.click(menu.enterOther);
    await settle(pending);
    assert.equal(menu.other.hidden, false);
    assert.equal(menu.home.inert, true);
    await settle(page.animations.slice(pending.length));
    assert.equal(menu.other.hidden, false);
    assert.equal(menu.home.hidden, true);
});

test("only the returning background animation completion clears that menu's temporary selection", async () => {
    const page = fixture();
    const first = page.menu(), second = page.menu();
    for (const menu of [first, second]) {
        page.click(menu.enter);
        await settle([...page.animations]);
        page.click(menu.back);
        await settle([...page.animations]);
        assert.equal(menu.enter.classList.contains("is-returning"), true);
    }
    page.document.emit("animationend", first.enter);
    page.document.emit("animationend", first.enter, undefined, { pseudoElement: "::after" });
    assert.equal(first.enter.classList.contains("is-returning"), true);
    page.document.emit("animationend", first.enter, undefined, { pseudoElement: "::before" });
    assert.equal(first.enter.classList.contains("is-returning"), false);
    assert.equal(second.enter.classList.contains("is-returning"), true);
    page.click(second.enter);
    assert.equal(second.enter.classList.contains("is-returning"), false);
    assert.equal(second.enter.classList.contains("is-navigating"), true);
    await settle([...page.animations]);
});

test("one menu finishing or closing does not change another menu's transition", async () => {
    const page = fixture();
    const first = page.menu(), second = page.menu();
    page.click(first.enter);
    const firstAnimations = [...page.animations];
    page.click(second.enter);
    const secondAnimations = page.animations.slice(firstAnimations.length);
    await settle(firstAnimations);
    page.close(first);
    assert.equal(second.home.inert, true);
    assert.equal(second.child.hidden, false);
    await settle(secondAnimations);
    assert.equal(second.home.hidden, true);
    assert.equal(second.child.hidden, false);
    assert.equal(first.home.hidden, false);
});

test("reduced motion switches immediately without scheduling animation or leaving inert panels", () => {
    const page = fixture({ reducedMotion: true });
    const menu = page.menu();
    page.click(menu.enter);
    assert.equal(menu.home.hidden, true);
    assert.equal(menu.home.inert, false);
    assert.equal(menu.child.hidden, false);
    page.click(menu.enterDeep);
    assert.equal(menu.child.hidden, true);
    assert.equal(menu.deep.hidden, false);
    page.click(menu.deepBack);
    assert.equal(menu.child.hidden, false);
    assert.equal(menu.deep.hidden, true);
    assert.equal(page.document.activeElement, menu.enterDeep);
    assert.equal(page.animations.length, 0);
    assert.equal(menu.root.querySelector(".is-returning"), null);
    assert.equal(menu.root.querySelector(".is-navigating"), null);
});

test("keyboard navigation only visits the current panel while its predecessor is still visible", async () => {
    const page = fixture();
    const menu = page.menu();
    page.click(menu.enter);
    assert.equal(menu.home.hidden, false);
    const down = page.key(menu.back, "ArrowDown");
    assert.equal(page.document.activeElement, menu.command);
    assert.equal(down.prevented, true);
    assert.equal(down.stopped, true);
    page.key(menu.command, "ArrowDown");
    assert.equal(page.document.activeElement, menu.enterDeep);
    page.key(menu.enterDeep, "Home");
    assert.equal(page.document.activeElement, menu.back);
    page.key(menu.back, "End");
    assert.equal(page.document.activeElement, menu.enterDeep);
    page.key(menu.enterDeep, "ArrowRight");
    assert.equal(page.document.activeElement, menu.deepBack);
    page.key(menu.deepBack, "ArrowLeft");
    assert.equal(page.document.activeElement, menu.enterDeep);
    page.key(menu.enterDeep, "Escape");
    assert.equal(page.document.activeElement, menu.toggle);
    assert.equal(menu.popup.classList.contains("show"), false);
    await settle([...page.animations]);
    assert.equal(menu.home.hidden, false);
    assert.equal(menu.child.hidden, true);
    assert.equal(menu.deep.hidden, true);
});

test("default logical-start alignment and explicit end alignment respect both text directions", () => {
    for (const direction of ["ltr", "rtl"]) {
        for (const alignEnd of [false, true]) {
            const page = fixture();
            const menu = page.menu({ direction, alignEnd, rect: { left: 300, top: 100, width: 80, height: 32 } });
            const bounds = menu.popup.getBoundingClientRect();
            assert.equal(bounds.left, (direction === "rtl") !== alignEnd ? 140 : 300);
            assert.ok(bounds.top >= menu.toggle.getBoundingClientRect().bottom);
            assert.equal(page.topLayer.has(menu.popup), true);
            assert.equal(menu.popup.style.position, "fixed");
            assert.equal(menu.popup.parentElement, menu.root, "Top-layer promotion must retain Blazor's DOM parent.");
        }
    }
});

test("viewport edges clamp horizontally and choose the side with usable vertical space", () => {
    const page = fixture();
    const bottom = page.menu({ rect: { left: 730, top: 550, width: 60, height: 32 } });
    let bounds = bottom.popup.getBoundingClientRect();
    assert.ok(bounds.left >= 0 && bounds.right <= 800);
    assert.ok(bounds.bottom <= bottom.toggle.getBoundingClientRect().top, "A menu near the bottom must flip above its trigger.");
    page.close(bottom);
    const top = page.menu({ openUpward: true, rect: { left: 12, top: 12, width: 80, height: 32 } });
    bounds = top.popup.getBoundingClientRect();
    assert.ok(bounds.top >= top.toggle.getBoundingClientRect().bottom, "An upward preference must flip down when there is no room above.");
    page.close(top);
    const upward = page.menu({ openUpward: true, rect: { left: 300, top: 350, width: 80, height: 32 } });
    assert.ok(upward.popup.getBoundingClientRect().bottom <= upward.toggle.getBoundingClientRect().top);
});

test("narrow viewports and tall panels stay inside the viewport with constrained menu height", () => {
    const page = fixture();
    page.viewport(180, 300);
    const menu = page.menu({ height: 1000, rect: { left: 120, top: 120, width: 50, height: 32 } });
    const bounds = menu.popup.getBoundingClientRect();
    assert.ok(bounds.left >= 0 && bounds.right <= 180);
    assert.ok(bounds.top >= 0 && bounds.bottom <= 300);
    assert.ok(bounds.height < menu.popup.scrollHeight, "The long menu must have a scrollable constrained height.");
    assert.ok(menu.popup.style.maxHeight);
});

test("a browser without Popover still positions and closes the ordinary Bootstrap menu", () => {
    const page = fixture({ popover: false });
    const menu = page.menu({ rect: { left: 300, top: 100, width: 80, height: 32 } });
    assert.equal(page.topLayer.size, 0);
    assert.equal(menu.popup.classList.contains("show"), true);
    assert.equal(menu.popup.getBoundingClientRect().left, 300);
    page.close(menu);
    assert.equal(menu.popup.classList.contains("show"), false);
    assert.equal(page.frames.size, 0);
});

test("lazy module loading promotes already-open menus once and does not duplicate listeners", () => {
    const page = fixture({ autoLoad: false });
    const menu = page.menu();
    assert.equal(page.topLayer.size, 0);
    page.load();
    assert.equal(page.topLayer.has(menu.popup), true);
    assert.equal(page.frames.size, 1);
    const documentCounts = page.document.counts();
    const windowCounts = page.window.counts();
    page.load();
    assert.deepEqual(page.document.counts(), documentCounts);
    assert.deepEqual(page.window.counts(), windowCounts);
    assert.equal(page.frames.size, 1);
    page.close(menu);
    assert.equal(page.topLayer.size, 0);
    assert.equal(page.frames.size, 0);
});

test("internal scrolling keeps the menu open while an outside scroll clears its resources", () => {
    const page = fixture();
    const menu = page.menu();
    page.document.emit("scroll", menu.viewport);
    assert.equal(page.topLayer.has(menu.popup), true);
    assert.equal(menu.popup.classList.contains("show"), true);
    page.document.emit("scroll", page.document);
    assert.equal(menu.popup.classList.contains("show"), false);
    assert.equal(page.topLayer.size, 0);
    assert.equal(page.frames.size, 0);
});

test("resize and visual viewport changes reposition without dropping the open menu", () => {
    const page = fixture();
    const menu = page.menu({ rect: { left: 700, top: 100, width: 80, height: 32 } });
    page.viewport(700, 600);
    page.window.emit("resize", page.window);
    assert.ok(menu.popup.getBoundingClientRect().right <= 700);
    page.window.visualViewport.offsetLeft = 40;
    page.window.visualViewport.offsetTop = 20;
    page.window.visualViewport.width = 320;
    page.window.visualViewport.height = 400;
    page.window.visualViewport.emit("resize", page.window.visualViewport);
    page.window.visualViewport.emit("scroll", page.window.visualViewport);
    const bounds = menu.popup.getBoundingClientRect();
    assert.ok(bounds.left >= 40 && bounds.right <= 360);
    assert.ok(bounds.top >= 20 && bounds.bottom <= 420);
    assert.equal(page.topLayer.has(menu.popup), true);
});

test("position tracking follows trigger movement and menu size changes with one frame per instance", () => {
    const page = fixture();
    const menu = page.menu({ rect: { left: 300, top: 430, width: 80, height: 32 } });
    page.flushFrame();
    const firstTop = menu.popup.getBoundingClientRect().top;
    menu.toggle.rect.left = 400;
    menu.popup.rect.height = 250;
    page.flushFrame();
    assert.equal(menu.popup.getBoundingClientRect().left, 400);
    assert.ok(menu.popup.getBoundingClientRect().top < firstTop);
    assert.equal(page.frames.size, 1);
    const second = page.menu();
    assert.equal(page.frames.size, 2);
    page.close(menu);
    assert.equal(page.frames.size, 1);
    assert.equal(page.topLayer.has(second.popup), true);
    page.close(second);
    assert.equal(page.frames.size, 0);
});

test("panel transitions recalculate placement when the destination height changes", async () => {
    const page = fixture();
    const menu = page.menu({ rect: { left: 300, top: 430, width: 80, height: 32 } });
    const previousTop = menu.popup.getBoundingClientRect().top;
    menu.popup.rect.height = 260;
    page.click(menu.enter);
    await settle([...page.animations]);
    assert.ok(menu.popup.getBoundingClientRect().top < previousTop);
    assert.equal(page.topLayer.has(menu.popup), true);
    page.close(menu);
    assert.equal(page.frames.size, 0);
});

test("disconnect cleans a disabled Bootstrap instance and permits a clean remount", async () => {
    const page = fixture();
    const menu = page.menu();
    page.click(menu.enter);
    const pending = [...page.animations];
    menu.toggle.disabled = true;
    const instance = menu.instance;
    page.disconnect(menu);
    await settle(pending);
    assert.equal(instance.disposed, true);
    assert.equal(page.topLayer.size, 0);
    assert.equal(page.frames.size, 0);
    assert.equal(menu.popup.classList.contains("show"), false);
    assert.equal(menu.toggle.getAttribute("aria-expanded"), "false");
    assert.equal(menu.home.hidden, false);
    assert.equal(menu.child.hidden, true);
    menu.toggle.disabled = false;
    page.remount(menu);
    assert.equal(page.topLayer.has(menu.popup), true);
    assert.equal(page.frames.size, 1);
    page.close(menu);
    assert.equal(page.frames.size, 0);
});

test("a newly disabled or fully scrolled-away trigger closes on the next tracking frame", () => {
    for (const reason of ["disabled", "offscreen"]) {
        const page = fixture();
        const menu = page.menu();
        if (reason === "disabled") menu.toggle.disabled = true;
        else menu.toggle.rect.top = 700;
        page.flushFrame();
        assert.equal(menu.popup.classList.contains("show"), false, reason);
        assert.equal(page.topLayer.size, 0, reason);
        assert.equal(page.frames.size, 0, reason);
        assert.equal(menu.toggle.getAttribute("aria-expanded"), "false", reason);
    }
});

test("a disabled menu opened before module loading is closed without leaving a surface", () => {
    const page = fixture({ autoLoad: false });
    const menu = page.menu();
    menu.toggle.disabled = true;
    page.load();
    assert.equal(menu.instance.disposed, true);
    assert.equal(menu.popup.classList.contains("show"), false);
    assert.equal(page.topLayer.size, 0);
    assert.equal(page.frames.size, 0);
});

test("a native popover close synchronizes Bootstrap state and stops position tracking", () => {
    const page = fixture();
    const menu = page.menu();
    menu.popup.hidePopover();
    page.document.emit("toggle", menu.popup, undefined, { newState: "closed" });
    assert.equal(menu.popup.classList.contains("show"), false);
    assert.equal(menu.toggle.getAttribute("aria-expanded"), "false");
    assert.equal(page.frames.size, 0);
});

test("leaf activation closes without swallowing a native link or Blazor action", () => {
    for (const tagName of ["A", "BUTTON"]) {
        const page = fixture();
        const menu = page.menu();
        menu.rootCommand.tagName = tagName;
        if (tagName === "A") menu.rootCommand.setAttribute("href", "/target");
        const event = page.click(menu.rootCommand);
        assert.equal(event.prevented, false);
        assert.equal(event.stopped, false);
        assert.equal(menu.popup.classList.contains("show"), false);
        assert.equal(page.topLayer.size, 0);
        assert.equal(page.frames.size, 0);
    }
});

test("entering, returning and closing reset a long menu's previous scroll position", async () => {
    const page = fixture();
    const menu = page.menu({ height: 1000 });
    menu.popup.scrollTop = 90;
    page.click(menu.enter);
    assert.equal(menu.popup.scrollTop, 0);
    await settle([...page.animations]);
    menu.popup.scrollTop = 70;
    page.click(menu.back);
    assert.equal(menu.popup.scrollTop, 0);
    await settle([...page.animations]);
    menu.popup.scrollTop = 55;
    page.close(menu);
    assert.equal(menu.popup.scrollTop, 0);
    assert.equal(page.frames.size, 0);
});

test("cancelling Bootstrap hide for an offscreen trigger keeps a tracking frame alive", () => {
    const page = fixture();
    const menu = page.menu();
    menu.instance.preventHide = true;
    menu.toggle.rect.top = 700;
    page.flushFrame();
    assert.equal(menu.popup.classList.contains("show"), true);
    assert.equal(menu.toggle.getAttribute("aria-expanded"), "true");
    assert.equal(page.topLayer.has(menu.popup), true);
    assert.equal(page.frames.size, 1);
    menu.toggle.rect.top = 100;
    menu.toggle.rect.left = 400;
    page.flushFrame();
    assert.equal(menu.popup.getBoundingClientRect().left, 400);
    menu.instance.preventHide = false;
    page.close(menu);
    assert.equal(page.topLayer.size, 0);
    assert.equal(page.frames.size, 0);
});

test("a cancelled Bootstrap hide after a native popover close restores the visible surface", () => {
    const page = fixture();
    const menu = page.menu();
    menu.instance.preventHide = true;
    menu.popup.hidePopover();
    page.document.emit("toggle", menu.popup, undefined, { newState: "closed" });
    assert.equal(menu.popup.classList.contains("show"), true);
    assert.equal(menu.toggle.getAttribute("aria-expanded"), "true");
    assert.equal(page.topLayer.has(menu.popup), true);
    assert.equal(page.frames.size, 1);
    menu.instance.preventHide = false;
    page.close(menu);
    assert.equal(page.topLayer.size, 0);
    assert.equal(page.frames.size, 0);
});

test("position tracking reacts to a direction change without moving the trigger", () => {
    const page = fixture();
    const menu = page.menu({ rect: { left: 300, top: 100, width: 80, height: 32 } });
    page.flushFrame();
    assert.equal(menu.popup.getBoundingClientRect().left, 300);
    menu.root.direction = "rtl";
    page.flushFrame();
    assert.equal(menu.popup.getBoundingClientRect().left, 140);
    page.close(menu);
    assert.equal(page.frames.size, 0);
});

test("End and Home reveal the focused item by scrolling only the long menu", () => {
    const page = fixture();
    page.viewport(800, 300);
    const menu = page.menu({ height: 1000 });
    menu.enter.rect = { left: 0, top: 0, width: 240, height: 40 };
    menu.enterOther.rect = { left: 0, top: 400, width: 240, height: 40 };
    menu.rootCommand.rect = { left: 0, top: 960, width: 240, height: 40 };
    const triggerBefore = menu.toggle.getBoundingClientRect();
    page.key(menu.toggle, "End");
    assert.equal(page.document.activeElement, menu.rootCommand);
    assert.ok(menu.popup.scrollTop > 0);
    assert.equal(menu.rootCommand.getBoundingClientRect().bottom, menu.popup.getBoundingClientRect().bottom);
    page.key(menu.rootCommand, "Home");
    assert.equal(page.document.activeElement, menu.enter);
    assert.equal(menu.popup.scrollTop, 0);
    assert.equal(menu.enter.getBoundingClientRect().top, menu.popup.getBoundingClientRect().top);
    assert.deepEqual(menu.toggle.getBoundingClientRect(), triggerBefore);
    assert.equal(page.document.body.scrollTop, 0);
    assert.equal(page.document.documentElement.scrollTop, 0);
});

test("arrow navigation scrolls an offscreen option into view while preserving the current layer", () => {
    const page = fixture({ reducedMotion: true });
    page.viewport(800, 300);
    const menu = page.menu({ height: 1000 });
    page.click(menu.enter);
    menu.back.rect = { left: 0, top: 0, width: 240, height: 40 };
    menu.command.rect = { left: 0, top: 400, width: 240, height: 40 };
    menu.enterDeep.rect = { left: 0, top: 960, width: 240, height: 40 };
    page.key(menu.back, "ArrowDown");
    assert.equal(page.document.activeElement, menu.command);
    assert.equal(menu.command.getBoundingClientRect().bottom, menu.popup.getBoundingClientRect().bottom);
    page.key(menu.command, "ArrowDown");
    assert.equal(page.document.activeElement, menu.enterDeep, "Disabled options must still be skipped.");
    assert.equal(menu.enterDeep.getBoundingClientRect().bottom, menu.popup.getBoundingClientRect().bottom);
    const bottomScroll = menu.popup.scrollTop;
    page.key(menu.enterDeep, "ArrowUp");
    assert.equal(page.document.activeElement, menu.command);
    assert.ok(menu.popup.scrollTop < bottomScroll);
    assert.equal(menu.command.getBoundingClientRect().top, menu.popup.getBoundingClientRect().top);
    assert.equal(menu.child.hidden, false);
    assert.equal(menu.deep.hidden, true);
    assert.equal(page.topLayer.has(menu.popup), true);
});

test("viewport resizing keeps the focused end item visible after the menu becomes shorter", () => {
    const page = fixture();
    const menu = page.menu({ height: 1000 });
    menu.rootCommand.rect = { left: 0, top: 960, width: 240, height: 40 };
    page.key(menu.toggle, "End");
    const initialScroll = menu.popup.scrollTop;
    page.viewport(800, 300);
    page.window.emit("resize", page.window);
    assert.equal(page.document.activeElement, menu.rootCommand);
    assert.ok(menu.popup.scrollTop > initialScroll);
    assert.equal(menu.rootCommand.getBoundingClientRect().bottom, menu.popup.getBoundingClientRect().bottom);
    assert.equal(page.document.body.scrollTop, 0);
});
