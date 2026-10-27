const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const componentsRoot = process.env.FFWEB_COMPONENTS_ROOT || path.join(__dirname, "..", "..", "Silmoon.Templates", "content", "Silmoon.AspNetCore.FullFunctionTemplate", "Components");
const source = fs.readFileSync(path.join(componentsRoot, "DropdownSelect.razor.js"), "utf8");

function fixture({ autoLoad = true } = {}) {
    const frames = new Map();
    const topLayer = new Set();
    let frameId = 0;
    class Events {
        constructor() { this.listeners = new Map(); }
        addEventListener(type, callback) {
            if (!this.listeners.has(type)) this.listeners.set(type, new Set());
            this.listeners.get(type).add(callback);
        }
        emit(type, target = this, properties = {}) {
            const event = { target, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...properties };
            for (const callback of this.listeners.get(type) || []) callback(event);
            return event;
        }
        counts() { return Object.fromEntries([...this.listeners].map(([type, callbacks]) => [type, callbacks.size])); }
    }
    class Element extends Events {
        constructor(tagName, dataset = {}) {
            super();
            this.tagName = tagName.toUpperCase();
            this.dataset = dataset;
            this.children = [];
            this.parentElement = null;
            this.style = {};
            this.open = false;
            this.disabled = false;
            this.className = "";
            this.rect = { top: 80, bottom: 120, left: 40, right: 240, width: 200, height: 40 };
        }
        get isConnected() { return this === document || this.parentElement?.isConnected === true; }
        appendChild(child) { child.remove(); child.parentElement = this; this.children.push(child); return child; }
        remove() {
            if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
            this.parentElement = null;
        }
        matches(selector) {
            if (selector === ":popover-open") return topLayer.has(this);
            if (selector === "details[data-dropdown-select]" || selector === "details[data-dropdown-select][open]") return this.tagName === "DETAILS" && Object.hasOwn(this.dataset, "dropdownSelect") && (!selector.endsWith("[open]") || this.open);
            if (selector === "[data-dropdown-option]" || selector === "[data-dropdown-option]:not(:disabled)") return Object.hasOwn(this.dataset, "dropdownOption") && (!selector.includes(":not") || !this.disabled);
            if (selector === ".dropdown-select-options") return this.className === "dropdown-select-options";
            if (selector === "summary") return this.tagName === "SUMMARY";
            throw new Error("Unsupported selector: " + selector);
        }
        closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
        querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        getBoundingClientRect() {
            const left = parseFloat(this.style.left ?? this.rect.left);
            const top = parseFloat(this.style.top ?? this.rect.top);
            return { ...this.rect, left, top, right: left + this.rect.width, bottom: top + this.rect.height };
        }
        focus() { document.activeElement = this; }
    }
    const document = new Element("document");
    document.documentElement = { clientWidth: 800, clientHeight: 600 };
    document.body = document.appendChild(new Element("body"));
    const window = new Events();
    const context = vm.createContext({ document, window,
        getComputedStyle: element => ({ direction: element.direction || "ltr" }),
        requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; }
    });
    const load = () => vm.runInContext(source, context);
    function createDropdown({ disabled = false, upward = false } = {}) {
        const root = document.body.appendChild(new Element("details", { dropdownSelect: "", disabled: String(disabled), openUpward: String(upward) }));
        const trigger = root.appendChild(new Element("summary"));
        const triggerText = trigger.appendChild(new Element("span"));
        const menu = root.appendChild(new Element("div"));
        menu.className = "dropdown-select-options";
        menu.rect = { top: 128, bottom: 328, left: 40, right: 240, width: 200, height: 200 };
        menu.showPopover = () => { assert.equal(menu.isConnected, true); topLayer.add(menu); };
        menu.hidePopover = () => { topLayer.delete(menu); };
        const button = menu.appendChild(new Element("button", { dropdownOption: "" }));
        const buttonText = button.appendChild(new Element("span"));
        const disabledOption = menu.appendChild(new Element("button", { dropdownOption: "" }));
        disabledOption.disabled = true;
        const link = menu.appendChild(new Element("a", { dropdownOption: "" }));
        link.href = "/language/change?culture=en&returnUrl=%2Fbackend";
        const linkText = link.appendChild(new Element("span"));
        return { root, trigger, triggerText, menu, button, buttonText, disabledOption, link, linkText,
            open() { root.open = true; document.emit("toggle", root); },
            key(key, target = document.activeElement || trigger) { return document.emit("keydown", target, { key }); }
        };
    }
    if (autoLoad) load();
    return { document, window, load, createDropdown, frames, topLayer,
        flushFrame() {
            for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
        },
        createCard() {
            const card = document.body.appendChild(new Element("section"));
            card.style.overflow = "hidden";
            card.rect = { top: 60, bottom: 130, left: 20, right: 260, width: 240, height: 70 };
            return card;
        }
    };
}

test("delegated handlers register once and work for instances added after script loading", () => {
    const f = fixture();
    const documentCounts = f.document.counts();
    const windowCounts = f.window.counts();
    f.load();
    f.load();
    assert.deepEqual(f.document.counts(), documentCounts);
    assert.deepEqual(f.window.counts(), windowCounts);
    assert.ok(Object.values(documentCounts).every(count => count === 1));
    const first = f.createDropdown();
    const second = f.createDropdown();
    first.open();
    second.open();
    assert.equal(first.root.open, false);
    assert.equal(second.root.open, true);
});

test("lazy loading synchronizes already-open details and closes disabled instances", () => {
    for (const disabled of [false, true]) {
        const f = fixture({ autoLoad: false });
        const item = f.createDropdown({ disabled });
        item.open();
        assert.equal(item.root.open, true);
        assert.equal(f.topLayer.has(item.menu), false, "the native toggle occurred before the module was available");
        assert.equal(f.frames.size, 0);
        f.load();
        assert.equal(item.root.open, !disabled);
        assert.equal(f.topLayer.has(item.menu), !disabled);
        assert.equal(f.frames.size, disabled ? 0 : 1);
        if (!disabled) {
            assert.equal(item.menu.style.top, "128px");
            item.key("Escape", item.trigger);
            f.flushFrame();
            assert.equal(f.topLayer.has(item.menu), false);
            assert.equal(f.frames.size, 0);
        }
    }
});

test("pointer, focus and resize close the appropriate instances without consuming input", () => {
    const f = fixture();
    const first = f.createDropdown();
    const second = f.createDropdown();
    first.open();
    assert.equal(f.document.emit("pointerdown", first.linkText).prevented, false);
    assert.equal(first.root.open, true);
    f.document.emit("focusin", second.trigger);
    assert.equal(first.root.open, false);
    second.open();
    f.document.emit("pointerdown", f.document.body);
    assert.equal(second.root.open, false);
    first.open();
    f.window.emit("resize");
    assert.equal(first.root.open, false);
});

test("keyboard opens, skips disabled options, wraps, and Escape restores the trigger", () => {
    const f = fixture();
    const item = f.createDropdown();
    item.trigger.focus();
    assert.equal(item.key("ArrowDown").prevented, true);
    assert.equal(item.root.open, true);
    assert.equal(f.document.activeElement, item.button);
    item.key("ArrowDown");
    assert.equal(f.document.activeElement, item.link);
    item.key("ArrowDown");
    assert.equal(f.document.activeElement, item.button);
    item.key("ArrowUp");
    assert.equal(f.document.activeElement, item.link);
    item.key("Home");
    assert.equal(f.document.activeElement, item.button);
    item.key("End");
    assert.equal(f.document.activeElement, item.link);
    const escape = item.key("Escape");
    assert.equal(escape.prevented, true);
    assert.equal(escape.stopped, true);
    assert.equal(item.root.open, false);
    assert.equal(f.document.activeElement, item.trigger);
    item.key("ArrowUp");
    assert.equal(f.document.activeElement, item.link);
});

test("selecting a value button closes without swallowing its Blazor click", () => {
    const f = fixture();
    const item = f.createDropdown();
    item.open();
    const event = f.document.emit("click", item.buttonText);
    assert.equal(item.root.open, false);
    assert.equal(event.prevented, false);
    assert.equal(event.stopped, false);
    assert.equal(f.document.activeElement, item.trigger);
});

test("navigation options preserve href and native modified-click behavior", () => {
    const f = fixture();
    const item = f.createDropdown();
    const href = item.link.href;
    for (const modifiers of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
        item.open();
        item.link.focus();
        const event = f.document.emit("click", item.linkText, modifiers);
        assert.equal(item.root.open, false);
        assert.equal(event.prevented, false);
        assert.equal(event.stopped, false);
        assert.equal(item.link.href, href);
        assert.equal(f.document.activeElement, item.link, "navigation must not move focus to the old trigger");
    }
});

test("disabled roots cannot open or navigate and disabled options do not select", () => {
    const f = fixture();
    const disabled = f.createDropdown({ disabled: true });
    disabled.open();
    assert.equal(disabled.root.open, false);
    disabled.key("ArrowDown", disabled.trigger);
    assert.equal(disabled.root.open, false);
    assert.equal(f.document.activeElement, undefined);
    assert.equal(f.document.emit("click", disabled.triggerText).prevented, true);
    const enabled = f.createDropdown();
    enabled.open();
    f.document.emit("click", enabled.disabledOption);
    assert.equal(enabled.root.open, true);
    assert.equal(f.document.activeElement, undefined);
});

test("a menu inside a clipped card uses a native popover without moving its DOM parent", () => {
    const f = fixture();
    const card = f.createCard();
    const item = f.createDropdown();
    card.appendChild(item.root);
    item.open();
    assert.equal(f.topLayer.has(item.menu), true);
    assert.equal(item.menu.parentElement, item.root);
    assert.equal(item.root.parentElement, card);
    assert.equal(card.style.overflow, "hidden");
    assert.equal(item.menu.style.position, "fixed");
    assert.equal(item.menu.style.left, "40px");
    assert.equal(item.menu.style.top, "128px");
    assert.ok(item.menu.getBoundingClientRect().bottom > card.getBoundingClientRect().bottom);
});

test("summary close hides its popover; outside scrolling closes while menu scrolling stays open", () => {
    const f = fixture();
    const item = f.createDropdown();
    item.open();
    item.root.open = false;
    f.document.emit("toggle", item.root);
    assert.equal(f.topLayer.has(item.menu), false);
    item.open();
    f.document.emit("scroll", item.menu);
    assert.equal(item.root.open, true);
    assert.equal(f.topLayer.has(item.menu), true);
    f.document.emit("scroll", f.document.body);
    assert.equal(item.root.open, false);
    assert.equal(f.topLayer.has(item.menu), false);
    f.flushFrame();
    assert.equal(f.frames.size, 0);
});

test("one frame tracker follows layout movement and stops after the component is removed", () => {
    const f = fixture();
    const item = f.createDropdown();
    item.open();
    item.open();
    assert.equal(f.frames.size, 1);
    f.flushFrame();
    item.root.rect.top += 30;
    f.flushFrame();
    assert.equal(item.menu.style.top, "158px");
    assert.equal(f.frames.size, 1);
    item.root.remove();
    f.flushFrame();
    assert.equal(f.frames.size, 0);
    f.document.body.appendChild(item.root);
    item.open();
    assert.equal(f.frames.size, 1, "a remounted instance can start tracking again");
    item.key("Escape", item.trigger);
    f.flushFrame();
    assert.equal(f.frames.size, 0);
    assert.equal(f.topLayer.has(item.menu), false);
});
