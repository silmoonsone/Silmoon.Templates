const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const componentsRoot = process.env.FFWEB_COMPONENTS_ROOT || path.join(__dirname, "..", "..", "Silmoon.Templates", "content", "Silmoon.AspNetCore.FullFunctionTemplate", "Components");
const helperSource = fs.readFileSync(path.join(componentsRoot, "..", "wwwroot", "js", "picker-popover.js"), "utf8");

function fixture(kind = "enum") {
    const frames = new Map();
    const observers = [];
    let frameId = 0;
    class Events {
        constructor() { this.listeners = new Map(); }
        addEventListener(type, callback) {
            if (!this.listeners.has(type)) this.listeners.set(type, new Set());
            this.listeners.get(type).add(callback);
        }
        removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
        emit(type, target = this, properties = {}) {
            const event = { target, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...properties };
            for (const callback of [...(this.listeners.get(type) ?? [])]) callback(event);
            return event;
        }
        count() { return [...this.listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0); }
    }
    class Element extends Events {
        constructor() { super(); this.style = {}; this.isConnected = true; this.disabled = false; this.clicks = 0; this.parent = null; }
        get parentElement() { return this.parent; }
        contains(element) { return element === this || element?.parent === this || element?.parent?.parent === this; }
        click() { this.clicks++; }
        focus() { document.activeElement = this; }
        getClientRects() { return this.isConnected ? [this.getBoundingClientRect()] : []; }
    }
    class Observer {
        constructor(callback) { this.callback = callback; this.targets = new Set(); this.connected = true; observers.push(this); }
        observe(target) { this.targets.add(target); }
        unobserve(target) { this.targets.delete(target); }
        disconnect() { this.targets.clear(); this.connected = false; }
    }
    const root = new Element();
    const toggle = new Element();
    toggle.parent = root;
    const anchor = { left: 80, top: 80, width: 250, height: 38 };
    toggle.getBoundingClientRect = () => ({ ...anchor, right: anchor.left + anchor.width, bottom: anchor.top + anchor.height });
    const panel = new Element();
    panel.parent = root;
    panel.isConnected = false;
    panel.naturalHeight = 260;
    Object.defineProperties(panel, {
        scrollHeight: { get: () => panel.naturalHeight - 2 },
        clientHeight: { get: () => panel.getBoundingClientRect().height - 2 },
        offsetHeight: { get: () => panel.getBoundingClientRect().height }
    });
    panel.matches = selector => { assert.equal(selector, ":popover-open"); return panel.open === true; };
    panel.showPopover = () => { assert.equal(panel.isConnected, true); panel.open = true; panel.showCount = (panel.showCount ?? 0) + 1; };
    panel.hidePopover = () => { panel.open = false; };
    panel.getBoundingClientRect = () => ({
        left: parseFloat(panel.style.left ?? 0), top: parseFloat(panel.style.top ?? 0),
        width: parseFloat(panel.style.width ?? anchor.width), height: Math.min(panel.naturalHeight, parseFloat(panel.style.maxHeight ?? panel.naturalHeight))
    });
    const close = new Element();
    close.parent = panel;
    const options = [new Element(), new Element(), new Element()];
    options.forEach((option, index) => {
        option.parent = panel;
        option.getAttribute = name => name === "aria-selected" ? String(index === 1) : null;
        option.closest = selector => selector === "[data-enum-select-option]" ? option : null;
    });
    toggle.closest = () => null;
    root.querySelector = selector => {
        if (selector.endsWith("-toggle")) return toggle;
        if (selector.endsWith("-panel")) return panel.isConnected ? panel : null;
        if (selector.endsWith("-close]")) return panel.isConnected ? close : null;
        throw new Error(selector);
    };
    root.querySelectorAll = selector => {
        assert.equal(selector, "[data-enum-select-option]");
        return panel.isConnected ? options : [];
    };
    const document = new Events();
    document.documentElement = { clientWidth: 800 };
    document.body = new Element();
    const window = new Events();
    window.getComputedStyle = element => element.style;
    window.innerHeight = 600;
    window.visualViewport = new Events();
    Object.assign(window.visualViewport, { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 });
    const context = vm.createContext({ Element, document, window, ResizeObserver: Observer, MutationObserver: Observer,
        requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); }
    });
    vm.runInContext(helperSource.replace("export function", "function"), context);
    const moduleSource = fs.readFileSync(path.join(componentsRoot, kind === "enum" ? "EnumSelect.razor.js" : "TreePicker.razor.js"), "utf8");
    vm.runInContext(moduleSource.replace(/^\uFEFF/, "").replace(/^import .*;\r?\n/gm, "").replace(/export function/g, "function"), context);
    context.initialize(root);
    const flush = () => {
        for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
    };
    const mutate = () => { observers.filter(observer => observer.connected).forEach(observer => observer.callback()); flush(); };
    return { root, toggle, panel, close, options, anchor, document, window, observers, frames, context, flush, mutate,
        open() { panel.isConnected = true; mutate(); },
        removePanel() { panel.isConnected = false; panel.open = false; mutate(); },
        clean() {
            assert.equal(document.count() + root.count() + panel.count() + window.count() + window.visualViewport.count(), 0);
            assert.equal(observers.some(observer => observer.connected), false);
            assert.equal(frames.size, 0);
            assert.equal(panel.open === true, false);
        }
    };
}

test("enum and tree open a native popover while retaining their Blazor DOM parent", () => {
    for (const kind of ["enum", "tree"]) {
        const f = fixture(kind);
        f.open();
        assert.equal(f.panel.open, true);
        assert.equal(f.panel.parent, f.root);
        assert.equal(f.panel.style.width, "250px");
        assert.equal(f.panel.style.left, "80px");
        assert.equal(f.panel.style.top, "124px");
        f.context.dispose(f.root);
        f.clean();
    }
});

test("position flips above, clamps to narrow visual viewport and follows scrolling and resizing", () => {
    const f = fixture();
    f.anchor.top = 480;
    f.anchor.left = 750;
    f.open();
    assert.equal(f.panel.style.top, "214px");
    assert.equal(f.panel.style.left, "542px");
    f.window.visualViewport.width = 220;
    f.window.visualViewport.height = 300;
    f.anchor.left = 100;
    f.anchor.top = 140;
    f.window.visualViewport.emit("resize");
    f.flush();
    assert.equal(f.panel.style.width, "204px");
    assert.equal(f.panel.style.left, "8px");
    assert.equal(f.panel.style.maxHeight, "126px");
    assert.equal(f.panel.style.top, "8px");
    f.anchor.top = 30;
    f.window.emit("scroll");
    f.flush();
    assert.equal(f.panel.style.top, "74px");
    f.context.dispose(f.root);
    f.clean();
});

test("outside pointer closes once during the Blazor round trip and does not steal focus", () => {
    const f = fixture();
    f.open();
    f.document.emit("pointerdown", f.options[0]);
    assert.equal(f.close.clicks, 0);
    f.document.emit("pointerdown", f.document.body);
    assert.equal(f.panel.open, false);
    assert.equal(f.close.clicks, 1);
    assert.equal(f.document.activeElement, undefined);
    f.mutate();
    f.document.emit("pointerdown", f.document.body);
    assert.equal(f.panel.showCount, 1);
    assert.equal(f.close.clicks, 1);
    f.removePanel();
    f.open();
    assert.equal(f.panel.open, true);
    f.context.dispose(f.root);
});

test("Escape closes either component, restores its trigger and stops propagation", () => {
    for (const kind of ["enum", "tree"]) {
        const f = fixture(kind);
        f.open();
        const event = f.root.emit("keydown", f.toggle, { key: "Escape" });
        assert.equal(event.prevented, true);
        assert.equal(event.stopped, true);
        assert.equal(f.close.clicks, 1);
        assert.equal(f.panel.open, false);
        assert.equal(f.document.activeElement, f.toggle);
        f.context.dispose(f.root);
        f.clean();
    }
});

test("enum ArrowDown waits for the actual rendered panel, then arrow and Home/End navigation work", () => {
    const f = fixture();
    f.root.emit("keydown", f.toggle, { key: "ArrowDown" });
    assert.equal(f.toggle.clicks, 1);
    for (let index = 0; index < 20; index++) f.flush();
    f.open();
    assert.equal(f.document.activeElement, f.options[1]);
    f.root.emit("keydown", f.options[1], { key: "ArrowDown" });
    assert.equal(f.document.activeElement, f.options[2]);
    f.root.emit("keydown", f.options[2], { key: "Home" });
    assert.equal(f.document.activeElement, f.options[0]);
    f.root.emit("keydown", f.options[0], { key: "End" });
    assert.equal(f.document.activeElement, f.options[2]);
    f.context.dispose(f.root);
});

test("a native popover close synchronizes Blazor state without reopening the old panel", () => {
    const f = fixture("tree");
    f.open();
    f.panel.hidePopover();
    f.panel.emit("toggle", f.panel, { newState: "closed" });
    assert.equal(f.close.clicks, 1);
    f.mutate();
    assert.equal(f.panel.open, false);
    f.context.dispose(f.root);
    f.clean();
});

test("a disabled or scrolled-away trigger closes its panel", () => {
    for (const state of ["disabled", "outside"]) {
        const f = fixture("tree");
        f.open();
        if (state === "disabled") f.toggle.disabled = true;
        else f.anchor.top = -100;
        f.window.emit("scroll");
        f.flush();
        assert.equal(f.close.clicks, 1);
        assert.equal(f.panel.open, false);
        f.context.dispose(f.root);
    }
});

test("disconnect cleanup removes observers, global listeners and pending animation frames", () => {
    const f = fixture();
    f.open();
    f.root.isConnected = false;
    f.mutate();
    f.clean();
    f.context.dispose(f.root);
    f.clean();
});

test("scrolling the trigger outside a clipping ancestor closes the panel even inside the window", () => {
    const f = fixture("tree");
    f.root.style.overflowY = "auto";
    f.root.clientTop = 1;
    f.root.clientHeight = 120;
    f.root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 122 });
    f.open();
    assert.equal(f.panel.open, true, "A panel may extend beyond the clipping ancestor while its trigger is visible.");
    f.anchor.top = 150;
    f.window.emit("scroll");
    f.flush();
    assert.equal(f.panel.open, false);
    assert.equal(f.close.clicks, 1);
    f.context.dispose(f.root);
    f.clean();
});

test("repeated initialization is idempotent and an explicit dispose permits remounting", () => {
    const f = fixture("tree");
    f.context.initialize(f.root);
    assert.equal(f.observers.length, 2);
    f.open();
    f.window.emit("resize");
    assert.equal(f.frames.size, 1);
    f.context.dispose(f.root);
    f.clean();
    f.context.initialize(f.root);
    assert.equal(f.panel.open, true);
    f.context.dispose(f.root);
    f.clean();
});
