"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = process.env.MODERN_COLOR_SCRIPT_PATH
    ? path.resolve(process.env.MODERN_COLOR_SCRIPT_PATH)
    : path.join(__dirname, "../../Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/wwwroot/js/modern-color-layout.js");
const source = fs.readFileSync(scriptPath, "utf8");

class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    dispatch(type, target = this) {
        const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
        for (const listener of this.listeners.get(type) || []) listener(event);
        return event;
    }
    listenerCount(type) { return this.listeners.get(type)?.size || 0; }
}

// Minimal DOM operations used by the real layout script; no menu behavior is mocked.
class Element extends Target {
    constructor(tagName, attributes = {}) {
        super();
        this.tagName = tagName;
        this.attributes = new Map();
        this.children = [];
        this.parentElement = null;
        this.dataset = {};
        this.style = {
            setProperty(name, value) { this[name] = String(value); },
            removeProperty(name) { delete this[name]; },
            getPropertyValue(name) { return this[name] || ""; }
        };
        this.rect = { top: 0, bottom: 54 };
        this.classList = {
            contains: value => this.className.split(/\s+/).includes(value),
            add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(" "); },
            remove: (...values) => { this.className = this.className.split(/\s+/).filter(value => !values.includes(value)).join(" "); },
            toggle: (value, force) => {
                const enabled = force === undefined ? !this.classList.contains(value) : force;
                this.classList[enabled ? "add" : "remove"](value);
                return enabled;
            }
        };
        for (const [name, value] of Object.entries(attributes)) this.setAttribute(name, value);
    }
    get id() { return this.getAttribute("id") || ""; }
    set id(value) { this.setAttribute("id", value); }
    get className() { return this.getAttribute("class") || ""; }
    set className(value) { this.setAttribute("class", value); }
    get nextSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1] || null; }
    get nextElementSibling() { return this.nextSibling; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) {
        child.remove();
        child.parentElement = this;
        this.children.push(child);
        return child;
    }
    insertBefore(child, sibling) {
        if (!sibling) return this.appendChild(child);
        child.remove();
        const index = this.children.indexOf(sibling);
        assert.notEqual(index, -1, "the desktop sibling must still belong to its original parent");
        child.parentElement = this;
        this.children.splice(index, 0, child);
        return child;
    }
    getBoundingClientRect() { return this.rect; }
    remove() {
        if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
        this.parentElement = null;
    }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    matches(selector) {
        return selector.split(",").some(part => {
            const value = part.trim();
            if (value.startsWith("#")) return this.id === value.slice(1);
            if (value.startsWith(".")) return value.slice(1).split(".").every(name => this.classList.contains(name));
            const attribute = /^\[([^=\]]+)(?:=['"]([^'"]*)['"])?\]$/.exec(value);
            return attribute ? (attribute[2] === undefined ? this.hasAttribute(attribute[1]) : this.getAttribute(attribute[1]) === attribute[2]) : this.tagName === value;
        });
    }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
    querySelectorAll(selector) {
        return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function menuElements() {
    const menu = new Element("nav", { id: "menu" });
    function group(id, href) {
        const container = menu.appendChild(new Element("div", { class: "menu-group" }));
        const toggle = container.appendChild(new Element("button", { class: "menu-item menu-submenu-toggle", "aria-controls": id }));
        const submenu = container.appendChild(new Element("div", { id, class: "menu-submenu" }));
        const link = submenu.appendChild(new Element("a", { class: "menu-item", href }));
        return { toggle, submenu, link };
    }
    return {
        menu,
        toggle: new Element("button", { id: "toggle-menu" }),
        system: group("system-submenu", "/backend/settings"),
        maintenance: group("maintenance-submenu", "#export"),
        overview: menu.appendChild(new Element("a", { class: "menu-item", href: "/backend/overview" }))
    };
}

function markCurrent(link, mode = "both") {
    if (mode !== "aria") link.classList.add("active");
    if (mode !== "class") link.setAttribute("aria-current", "page");
}

function fixture(options = {}) {
    const document = new Element("document");
    document.documentElement = document.appendChild(new Element("html"));
    document.body = document.documentElement.appendChild(new Element("body"));
    document.readyState = "complete";
    document.getElementById = id => document.querySelector("#" + id);
    document.createElement = name => new Element(name);
    let elements = menuElements();
    if (options.current !== false) markCurrent(elements.system.link, options.current);
    document.body.appendChild(elements.toggle);
    let menuRegion = options.menuRegion ? document.body.appendChild(new Element("div", { class: "modern-color-menu-region" })) : null;
    if (menuRegion) menuRegion.rect.bottom = 1600;
    (menuRegion || document.body).appendChild(elements.menu);
    const window = new Target();
    window.location = { hash: options.hash || "" };
    window.innerHeight = 800;
    window.scrollY = 0;
    window.setTimeout = callback => callback();
    window.scrollTo = value => { window.lastScrollRequest = value; };
    if (options.visualViewport) window.visualViewport = Object.assign(new Target(), options.visualViewport);
    const frames = new Map();
    let nextFrame = 0;
    window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
    window.cancelAnimationFrame = id => frames.delete(id);
    window.getComputedStyle = element => ({
        top: element.style.top || "20px",
        paddingBottom: "20px",
        getPropertyValue: name => options.rootStyles?.[name] ?? (name === "--mobile-menu-gap" ? "10px" : "")
    });
    const observers = [];
    window.ResizeObserver = class {
        constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
        observe(target) { this.targets.add(target); }
        disconnect() { this.targets.clear(); }
    };
    const media = new Map();
    window.matchMedia = query => {
        if (!media.has(query)) media.set(query, Object.assign(new Target(), { matches: false }));
        return media.get(query);
    };
    const storage = new Map();
    const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
    vm.runInNewContext(source, { document, window, localStorage }, { filename: scriptPath });
    return {
        document, window, observers, storage,
        get menuRegion() { return menuRegion; },
        get elements() { return elements; },
        get pendingFrames() { return frames.size; },
        flushFrame() {
            const callbacks = [...frames.values()];
            frames.clear();
            callbacks.forEach(callback => callback());
        },
        resizeRegion() {
            for (const observer of observers) {
                if (observer.targets.has(menuRegion)) observer.callback();
            }
        },
        setMobile(matches) {
            const query = window.matchMedia("(max-width: 768px)");
            query.matches = matches;
            query.dispatch("change");
        },
        refresh() { window.ModernColorLayout.refresh(); },
        dispose() { window.ModernColorLayout.dispose(); },
        click(target) { return elements.menu.dispatch("click", target); },
        replace(next) {
            elements.menu.remove();
            elements.toggle.remove();
            document.body.appendChild(next.toggle);
            (menuRegion || document.body).appendChild(next.menu);
            elements = next;
            window.ModernColorLayout.refresh();
        },
        replaceRegion(next) {
            // Replace only the rendered fragment. Portaled children must be owned by the core.
            elements.toggle.remove();
            menuRegion.remove();
            document.body.appendChild(next.toggle);
            menuRegion = document.body.appendChild(new Element("div", { class: "modern-color-menu-region" }));
            menuRegion.rect.bottom = 1600;
            menuRegion.appendChild(next.menu);
            elements = next;
            window.ModernColorLayout.refresh();
        }
    };
}

function assertExpanded(group, expanded) {
    assert.equal(group.toggle.getAttribute("aria-expanded"), String(expanded));
    assert.equal(group.submenu.classList.contains("open"), expanded);
}

test("modern menu initializes current class or aria-current groups without duplicate refresh handlers", () => {
    for (const current of ["class", "aria", "both"]) {
        const page = fixture({ current });
        for (let count = 0; count < 3; count++) page.refresh();
        assertExpanded(page.elements.system, true);
        assertExpanded(page.elements.maintenance, false);
        assert.equal(page.elements.system.toggle.classList.contains("child-active"), true);
        assert.equal(page.elements.menu.listenerCount("click"), 1);
        assert.equal(page.window.listenerCount("hashchange"), 1);
        page.click(page.elements.system.toggle);
        assertExpanded(page.elements.system, false);
    }
});

test("modern menu outside link does not reopen a manually collapsed group with stale aria-current", () => {
    const page = fixture();
    const { system, overview } = page.elements;
    page.click(system.toggle);
    assertExpanded(system, false);
    const icon = overview.appendChild(new Element("i"));
    const event = page.click(icon);
    assert.equal(event.defaultPrevented, false, "ordinary navigation remains available");
    assert.equal(system.link.getAttribute("aria-current"), "page", "the framework has not rerendered yet");
    assert.equal(system.link.classList.contains("active"), false);
    assert.equal(overview.classList.contains("active"), true);
    assert.equal(system.toggle.classList.contains("child-active"), false);
    assertExpanded(system, false);
});

test("modern menu cross-group click expands only the clicked group despite old aria-current", () => {
    const page = fixture();
    const { system, maintenance } = page.elements;
    page.click(system.toggle);
    page.click(maintenance.link);
    assertExpanded(system, false);
    assertExpanded(maintenance, true);
    assert.equal(system.toggle.classList.contains("child-active"), false);
    assert.equal(maintenance.toggle.classList.contains("child-active"), true);
});

test("modern menu refresh still reopens the current DOM group after a manual collapse", () => {
    const page = fixture();
    page.click(page.elements.system.toggle);
    assertExpanded(page.elements.system, false);
    page.refresh();
    assertExpanded(page.elements.system, true);
    assert.equal(page.elements.system.toggle.classList.contains("child-active"), true);
});

test("modern menu refresh preserves inactive groups manually expanded or collapsed", () => {
    const page = fixture({ current: false });
    const { system, maintenance, overview } = page.elements;
    page.click(system.toggle);
    page.click(maintenance.toggle);
    page.click(maintenance.toggle);
    page.click(overview);
    page.refresh();
    page.refresh();
    assertExpanded(system, true);
    assertExpanded(maintenance, false);
    assert.equal(system.toggle.classList.contains("child-active"), false);
    assert.equal(maintenance.toggle.classList.contains("child-active"), false);
});

test("modern menu hash navigation uses its matching link instead of stale page attributes", () => {
    const page = fixture();
    page.click(page.elements.system.toggle);
    page.window.location.hash = "#export";
    page.window.dispatch("hashchange");
    assertExpanded(page.elements.system, false);
    assertExpanded(page.elements.maintenance, true);
    assert.equal(page.elements.system.toggle.classList.contains("child-active"), false);
    assert.equal(page.elements.maintenance.link.classList.contains("active"), true);
    page.window.location.hash = "#unmatched";
    page.window.dispatch("hashchange");
    assert.equal(page.elements.maintenance.link.classList.contains("active"), true, "unmatched hash does not invent an active link");
});

test("modern menu initial and repeated refresh honor a matching hash over stale page attributes", () => {
    const page = fixture({ hash: "#export" });
    page.refresh();
    assertExpanded(page.elements.system, false);
    assertExpanded(page.elements.maintenance, true);
    assert.equal(page.elements.system.toggle.classList.contains("child-active"), false);
});

test("modern menu replaced DOM restores choices by stable id and detaches the previous binding", () => {
    const page = fixture();
    const old = page.elements;
    page.click(old.system.toggle);
    page.click(old.maintenance.toggle);
    const next = menuElements();
    markCurrent(next.overview);
    page.replace(next);
    page.refresh();
    assertExpanded(next.system, false);
    assertExpanded(next.maintenance, true);
    assert.equal(old.menu.listenerCount("click"), 0);
    assert.equal(old.toggle.listenerCount("click"), 0);
    assert.equal(next.menu.listenerCount("click"), 1);
    assert.equal(page.document.listenerCount("click"), 2, "one theme delegate and one outside-menu handler");
    assert.equal(page.window.listenerCount("hashchange"), 1);
    page.click(next.maintenance.toggle);
    assertExpanded(next.maintenance, false);
    const current = menuElements();
    markCurrent(current.system.link);
    page.replace(current);
    assertExpanded(current.system, true, "new current page overrides the stored collapsed preference");
    assertExpanded(current.maintenance, false);
});

test("footer entering and leaving the viewport shrinks and restores the desktop menu without moving its top", () => {
    const page = fixture({ menuRegion: true });
    const menu = page.elements.menu;
    const height = () => menu.style.getPropertyValue("--modern-color-menu-height");
    assert.equal(height(), "760px", "the long page initially allows the full viewport minus outer spacing");

    page.menuRegion.rect.bottom = 730;
    page.window.dispatch("scroll");
    page.window.dispatch("scroll");
    assert.equal(page.pendingFrames, 1, "scroll events share one pending layout measurement");
    page.flushFrame();
    assert.equal(height(), "710px", "menu ends before the visible footer instead of pushing its top upward");
    assert.equal(menu.style.top, undefined, "desktop top remains controlled by the sticky CSS rule");

    page.menuRegion.rect.bottom = 1600;
    page.window.dispatch("scroll");
    page.flushFrame();
    assert.equal(height(), "760px", "scrolling away from the footer restores the available height");
});

test("desktop menu responds to content and viewport resizing without waiting for scrolling", () => {
    const page = fixture({ menuRegion: true });
    const height = () => page.elements.menu.style.getPropertyValue("--modern-color-menu-height");
    page.menuRegion.rect.bottom = 700;
    page.resizeRegion();
    page.flushFrame();
    assert.equal(height(), "680px", "a shorter content region or taller footer updates the menu boundary");

    page.window.innerHeight = 600;
    page.window.dispatch("resize");
    page.flushFrame();
    assert.equal(height(), "560px", "the menu also respects a shorter browser viewport");

    page.menuRegion.rect.bottom = -10;
    page.resizeRegion();
    page.flushFrame();
    assert.equal(height(), "0px", "a footer above the sticky position cannot produce a negative CSS height");
});

test("refresh remeasures an existing footer layout without duplicate observers or event listeners", () => {
    const page = fixture({ menuRegion: true });
    const scrollListeners = page.window.listenerCount("scroll");
    const resizeListeners = page.window.listenerCount("resize");
    page.menuRegion.rect.bottom = 720;
    for (let count = 0; count < 3; count++) page.refresh();
    assert.equal(page.elements.menu.style.getPropertyValue("--modern-color-menu-height"), "700px");
    assert.equal(page.observers.length, 1);
    assert.equal(page.window.listenerCount("scroll"), scrollListeners);
    assert.equal(page.window.listenerCount("resize"), resizeListeners);
});

test("mobile menu clears desktop height and restores its original region and current height on desktop", () => {
    const page = fixture({ menuRegion: true });
    const menu = page.elements.menu;
    page.setMobile(true);
    assert.equal(menu.parentElement, page.document.body);
    assert.equal(menu.style.getPropertyValue("--modern-color-menu-height"), "");
    assert.equal(menu.style.top, "64px", "mobile placement still follows the menu button");

    page.menuRegion.rect.bottom = 700;
    page.refresh();
    page.setMobile(false);
    assert.equal(menu.parentElement, page.menuRegion);
    assert.equal(menu.style.getPropertyValue("top"), "", "returning to desktop releases the mobile top override");
    assert.equal(menu.style.getPropertyValue("--modern-color-menu-height"), "680px");
    assert.equal(page.observers.length, 1);
});

test("replacing or removing a footer menu cancels old measurements and disconnects its observer", () => {
    const page = fixture({ menuRegion: true });
    const oldMenu = page.elements.menu;
    const oldObserver = page.observers[0];
    const scrollListeners = page.window.listenerCount("scroll");
    page.window.dispatch("scroll");
    assert.equal(page.pendingFrames, 1);
    page.replace(menuElements());
    assert.equal(page.pendingFrames, 0, "replacement cancels the old queued animation frame");
    assert.equal(oldObserver.targets.size, 0, "replacement disconnects the old region observer");
    assert.equal(oldMenu.style.getPropertyValue("--modern-color-menu-height"), "");
    assert.equal(page.window.listenerCount("scroll"), scrollListeners);

    page.menuRegion.rect.bottom = 710;
    page.window.dispatch("scroll");
    page.flushFrame();
    assert.equal(page.elements.menu.style.getPropertyValue("--modern-color-menu-height"), "690px");
    assert.equal(oldMenu.style.getPropertyValue("--modern-color-menu-height"), "", "detached menus receive no later updates");

    page.window.dispatch("scroll");
    page.elements.menu.remove();
    page.refresh();
    assert.equal(page.pendingFrames, 0);
    assert.equal(page.observers[1].targets.size, 0);
    assert.equal(page.window.listenerCount("scroll"), scrollListeners, "the single shared viewport listener still serves back-to-top");
});

test("back-to-top replacement reuses window listeners and releases the detached button", () => {
    const page = fixture({ menuRegion: true });
    assert.equal(page.window.listenerCount("scroll"), 1);
    assert.equal(page.window.listenerCount("resize"), 1);
    for (let count = 0; count < 3; count++) {
        const oldButton = page.document.querySelector(".back-to-top");
        oldButton.remove();
        page.refresh();
        const button = page.document.querySelector(".back-to-top");
        assert.equal(oldButton.listenerCount("click"), 0);
        assert.equal(button.listenerCount("click"), 1);
        page.window.scrollY = 1000;
        page.window.dispatch("scroll");
        page.flushFrame();
        assert.equal(oldButton.classList.contains("visible"), false, "detached buttons are no longer updated");
        assert.equal(button.classList.contains("visible"), true);
        assert.equal(page.window.listenerCount("scroll"), 1);
        assert.equal(page.window.listenerCount("resize"), 1);
    }
});

test("mobile fragment replacement removes the orphaned portal before resolving the new menu", () => {
    const page = fixture({ menuRegion: true });
    page.setMobile(true);
    const old = page.elements;
    const oldObserver = page.observers[0];
    page.replaceRegion(menuElements());
    assert.equal(page.document.querySelectorAll("#menu").length, 1);
    assert.equal(page.document.contains(old.menu), false);
    assert.equal(old.menu.listenerCount("click"), 0);
    assert.equal(oldObserver.targets.size, 0);
    assert.equal(page.elements.menu.parentElement, page.document.body);
    page.setMobile(false);
    assert.equal(page.elements.menu.parentElement, page.menuRegion);
    assert.equal(page.elements.menu.listenerCount("click"), 1);
});

test("viewport updates skip unchanged desktop menu height writes", () => {
    const page = fixture({ menuRegion: true });
    const style = page.elements.menu.style;
    const originalSet = style.setProperty.bind(style);
    let writes = 0;
    style.setProperty = (name, value) => { if (name === "--modern-color-menu-height") writes++; originalSet(name, value); };
    for (let frame = 0; frame < 20; frame++) {
        page.menuRegion.rect.bottom = 2000 - frame * 10;
        page.window.dispatch("scroll");
        page.window.dispatch("resize");
        assert.equal(page.pendingFrames, 1, "window events share one read/write batch");
        page.flushFrame();
    }
    assert.equal(writes, 0, "the menu remains viewport-height while the footer is below view");
    page.menuRegion.rect.bottom = 700;
    page.resizeRegion();
    page.flushFrame();
    assert.equal(writes, 1);
    assert.equal(style.getPropertyValue("--modern-color-menu-height"), "680px");
});

test("mobile menu limits use the visible viewport and clear when returning to desktop", () => {
    for (const menuRegion of [false, true]) {
        const page = fixture({ menuRegion, visualViewport: { height: 300, offsetTop: 100 } });
        page.setMobile(true);
        const menu = page.elements.menu;
        assert.equal(menu.style.top, "110px");
        assert.equal(menu.style.getPropertyValue("--modern-color-mobile-menu-height"), "270px");
        page.window.visualViewport.height = 180;
        page.window.visualViewport.offsetTop = 160;
        page.window.visualViewport.dispatch("resize");
        page.window.visualViewport.dispatch("scroll");
        assert.equal(page.pendingFrames, 1);
        page.flushFrame();
        assert.equal(menu.style.top, "170px");
        assert.equal(menu.style.getPropertyValue("--modern-color-mobile-menu-height"), "150px");
        page.window.visualViewport.height = 70;
        page.window.visualViewport.offsetTop = 0;
        page.window.visualViewport.dispatch("resize");
        page.flushFrame();
        assert.equal(menu.style.getPropertyValue("--modern-color-mobile-menu-height"), "0px");
        page.setMobile(false);
        assert.equal(menu.style.getPropertyValue("--modern-color-mobile-menu-height"), "");
        assert.equal(menu.style.getPropertyValue("top"), "");
    }
});

test("mobile fallback height honors a configured zero button gap", () => {
    const page = fixture({ rootStyles: { "--mobile-menu-gap": "0px", "--mobile-edge-offset": "12px" } });
    page.setMobile(true);
    assert.equal(page.elements.menu.style.top, "54px");
    assert.equal(page.elements.menu.style.getPropertyValue("--modern-color-mobile-menu-height"), "734px");
});

test("dispose restores a live menu portal and releases all runtime handlers before reinitialization", () => {
    const page = fixture({ menuRegion: true, visualViewport: { height: 800, offsetTop: 0 } });
    page.setMobile(true);
    page.window.dispatch("scroll");
    page.dispose();
    assert.equal(page.pendingFrames, 0);
    assert.equal(page.elements.menu.parentElement, page.menuRegion);
    assert.equal(page.elements.menu.listenerCount("click"), 0);
    assert.equal(page.document.querySelector(".back-to-top"), null);
    for (const type of ["scroll", "resize", "hashchange"]) assert.equal(page.window.listenerCount(type), 0);
    assert.equal(page.window.visualViewport.listenerCount("resize"), 0);
    assert.equal(page.window.visualViewport.listenerCount("scroll"), 0);
    assert.equal(page.document.listenerCount("click"), 0);
    assert.equal(page.document.listenerCount("keydown"), 0);
    assert.equal(page.observers[0].targets.size, 0);
    page.refresh();
    page.refresh();
    assert.equal(page.elements.menu.parentElement, page.document.body);
    assert.equal(page.document.querySelectorAll("#menu").length, 1);
    assert.equal(page.window.listenerCount("scroll"), 1);
    assert.equal(page.window.listenerCount("resize"), 1);
});

test("refresh updates the back-to-top label and newly rendered theme buttons use one delegate", () => {
    const page = fixture();
    const label = page.document.body.appendChild(new Element("div", { "data-back-to-top-label": "" }));
    label.dataset.backToTopLabel = "Back to top";
    const themeButton = page.document.body.appendChild(new Element("button", { class: "theme-btn" }));
    themeButton.dataset.theme = "dark";
    page.refresh();
    page.refresh();
    assert.equal(page.document.querySelector(".back-to-top").getAttribute("aria-label"), "Back to top");
    page.document.dispatch("click", themeButton);
    assert.equal(page.document.documentElement.getAttribute("data-theme"), "dark");
    assert.equal(themeButton.getAttribute("aria-pressed"), "true");
    assert.equal(page.document.listenerCount("click"), 2);
    page.dispose();
    themeButton.dataset.theme = "light";
    page.document.dispatch("click", themeButton);
    assert.equal(page.document.documentElement.getAttribute("data-theme"), "dark", "disposed delegates do not handle later input");
});

test("optional Blazor initialization binds once and restores layouts after enhanced navigation", () => {
    const page = fixture();
    const host = page.document.body.appendChild(new Element("div", { class: "trading-layout" }));
    const blazor = new Target();
    page.window.Blazor = blazor;
    page.window.ModernColorLayout.initBlazor();
    page.window.ModernColorLayout.initBlazor();
    assert.equal(blazor.listenerCount("enhancedload"), 1);
    assert.equal(page.window.listenerCount("scroll"), 1);
    host.remove();
    blazor.dispatch("enhancedload");
    assert.equal(page.window.listenerCount("scroll"), 0);
    assert.equal(page.document.querySelector(".back-to-top"), null);
    page.document.body.appendChild(host);
    blazor.dispatch("enhancedload");
    assert.equal(page.window.listenerCount("scroll"), 1);
    assert.ok(page.document.querySelector(".back-to-top"));
    assert.equal(blazor.listenerCount("enhancedload"), 1);
});

test("optional Blazor initialization can bind after Blazor becomes available", () => {
    const page = fixture();
    page.document.body.appendChild(new Element("div", { class: "trading-layout" }));
    assert.equal(page.window.Blazor, undefined);
    page.window.ModernColorLayout.initBlazor();
    const blazor = page.window.Blazor = new Target();
    page.window.ModernColorLayout.initBlazor();
    page.window.ModernColorLayout.initBlazor();
    assert.equal(blazor.listenerCount("enhancedload"), 1);
    assert.equal(page.window.listenerCount("scroll"), 1);
});
