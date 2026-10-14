"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../../Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/wwwroot/js/modern-color-layout.js");
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
        this.style = {};
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
            const attribute = /^\[([^=]+)='([^']*)'\]$/.exec(value);
            return attribute ? this.getAttribute(attribute[1]) === attribute[2] : this.tagName === value;
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
    document.body.appendChild(elements.menu);
    const window = new Target();
    window.location = { hash: options.hash || "" };
    window.innerHeight = 800;
    window.scrollY = 0;
    window.setTimeout = callback => callback();
    const media = new Map();
    window.matchMedia = query => {
        if (!media.has(query)) media.set(query, Object.assign(new Target(), { matches: false }));
        return media.get(query);
    };
    const storage = new Map();
    const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
    vm.runInNewContext(source, { document, window, localStorage }, { filename: scriptPath });
    return {
        document, window,
        get elements() { return elements; },
        refresh() { window.ModernColorLayout.refresh(); },
        click(target) { return elements.menu.dispatch("click", target); },
        replace(next) {
            elements.menu.remove();
            elements.toggle.remove();
            document.body.appendChild(next.toggle);
            document.body.appendChild(next.menu);
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
    assert.equal(page.document.listenerCount("click"), 1);
    assert.equal(page.window.listenerCount("hashchange"), 1);
    page.click(next.maintenance.toggle);
    assertExpanded(next.maintenance, false);
    const current = menuElements();
    markCurrent(current.system.link);
    page.replace(current);
    assertExpanded(current.system, true, "new current page overrides the stored collapsed preference");
    assertExpanded(current.maintenance, false);
});
