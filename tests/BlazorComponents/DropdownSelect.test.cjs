const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const componentsRoot = process.env.FFWEB_COMPONENTS_ROOT || path.join(__dirname, "..", "..", "Silmoon.Templates", "content", "Silmoon.AspNetCore.FullFunctionTemplate", "Components");
const source = fs.readFileSync(path.join(componentsRoot, "DropdownSelect.razor.js"), "utf8");

function fixture({ autoLoad = true, popover = true, surfaceAnimations = false, reducedMotion = false, detailsContent = true } = {}) {
    const frames = new Map();
    const topLayer = new Set();
    const animations = [];
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
            this.inert = false;
            this.clientTop = 0;
            this._scrollTop = 0;
            this.attributes = new Map();
            this.classList = {
                contains: name => this.className.split(/\s+/).includes(name),
                add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" "); },
                remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(" "); },
                toggle: (name, force) => { const add = force ?? !this.classList.contains(name); this.classList[add ? "add" : "remove"](name); return add; }
            };
            this.rect = { top: 80, bottom: 120, left: 40, right: 240, width: 200, height: 40 };
        }
        setAttribute(name, value) { this.attributes.set(name, String(value)); }
        getAttribute(name) { return this.attributes.get(name) ?? null; }
        removeAttribute(name) { this.attributes.delete(name); }
        hasAttribute(name) { return this.attributes.has(name); }
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
            if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
            if (selector === "summary") return this.tagName === "SUMMARY";
            throw new Error("Unsupported selector: " + selector);
        }
        closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
        querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        contains(target) { return this === target || this.children.some(child => child.contains(target)); }
        getBoundingClientRect() {
            if (Object.hasOwn(this.dataset, "dropdownOption")) {
                const menu = this.closest(".dropdown-select-options");
                const bounds = menu.getBoundingClientRect();
                const left = bounds.left + this.rect.left;
                const top = bounds.top + this.rect.top - menu.scrollTop;
                return { ...this.rect, left, top, right: left + this.rect.width, bottom: top + this.rect.height };
            }
            const limit = value => value ? Math.min(...[...value.matchAll(/(\d+(?:\.\d+)?)(px|rem)/g)].map(match => Number(match[1]) * (match[2] === "rem" ? 16 : 1))) : Infinity;
            const minimumWidth = this.classList.contains("dropdown-select-options") ? (this.style.minWidth ? limit(this.style.minWidth) : 160) : 0;
            const width = Math.max(minimumWidth, Math.min(this.rect.width, limit(this.style.maxWidth)));
            const height = Math.min(this.rect.height, limit(this.style.maxHeight));
            const origin = this.style.position === "absolute" ? this.parentElement.getBoundingClientRect() : { left: 0, top: 0 };
            const left = this.style.left === undefined ? this.rect.left : parseFloat(this.style.left) + origin.left;
            const top = this.style.top === undefined ? this.rect.top : parseFloat(this.style.top) + origin.top;
            return { ...this.rect, left, top, width, height, right: left + width, bottom: top + height };
        }
        get offsetWidth() { return this.getBoundingClientRect().width; }
        get offsetHeight() { return this.getBoundingClientRect().height; }
        get clientWidth() { return this.offsetWidth; }
        get clientHeight() { return this.offsetHeight; }
        get scrollHeight() { return this.rect.height; }
        get scrollTop() { return this._scrollTop; }
        set scrollTop(value) { this._scrollTop = Math.max(0, Math.min(value, Math.max(0, this.scrollHeight - this.clientHeight))); }
        focus() { document.activeElement = this; }
        animate(keyframes, options) {
            let resolve, reject;
            const animation = { element: this, keyframes, options, opacity: keyframes[0].opacity, cancelled: false,
                finished: new Promise((yes, no) => { resolve = yes; reject = no; }),
                sample(opacity) { this.opacity = opacity; },
                finish() { this.opacity = keyframes.at(-1).opacity; resolve(); },
                cancel() { this.cancelled = true; reject(new Error("Animation cancelled")); }
            };
            animation.finished.catch(() => {});
            animations.push(animation);
            return animation;
        }
    }
    const document = new Element("document");
    document.documentElement = { clientWidth: 800, clientHeight: 600 };
    document.body = document.appendChild(new Element("body"));
    const window = new Events();
    window.innerWidth = 800;
    window.innerHeight = 600;
    window.visualViewport = Object.assign(new Events(), { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 });
    window.matchMedia = () => ({ matches: reducedMotion });
    window.CSS = { supports: value => value === "selector(::details-content)" && detailsContent };
    const requestAnimationFrame = callback => { const id = ++frameId; frames.set(id, callback); return id; };
    const cancelAnimationFrame = id => frames.delete(id);
    window.requestAnimationFrame = requestAnimationFrame;
    window.cancelAnimationFrame = cancelAnimationFrame;
    const context = vm.createContext({ document, window, CSS: window.CSS, requestAnimationFrame, cancelAnimationFrame,
        getComputedStyle: element => ({ direction: element.direction || "ltr", opacity: String(animations.findLast(animation => animation.element === element && !animation.cancelled)?.opacity ?? element.style.opacity ?? 1) })
    });
    const load = () => vm.runInContext(source, context);
    function createDropdown({ disabled = false, upward = false, alignEnd = false, direction = "ltr", rect = { top: 80, left: 40, width: 200, height: 40 }, menuWidth = 200, menuHeight = 200 } = {}) {
        const root = document.body.appendChild(new Element("details", { dropdownSelect: "", disabled: String(disabled), openUpward: String(upward), alignEnd: String(alignEnd) }));
        root.rect = rect;
        root.direction = direction;
        const trigger = root.appendChild(new Element("summary"));
        trigger.rect = root.rect;
        const triggerText = trigger.appendChild(new Element("span"));
        const menu = root.appendChild(new Element("div"));
        menu.className = "dropdown-select-options";
        menu.rect = { top: 128, left: 40, width: menuWidth, height: menuHeight };
        if (popover) {
            menu.showPopover = () => { assert.equal(menu.isConnected, true); topLayer.add(menu); };
            menu.hidePopover = () => { topLayer.delete(menu); };
        }
        if (!surfaceAnimations) menu.animate = undefined;
        const button = menu.appendChild(new Element("button", { dropdownOption: "" }));
        button.rect = { left: 0, top: 0, width: menuWidth, height: 40 };
        const buttonText = button.appendChild(new Element("span"));
        const disabledOption = menu.appendChild(new Element("button", { dropdownOption: "" }));
        disabledOption.rect = { left: 0, top: 40, width: menuWidth, height: 40 };
        disabledOption.disabled = true;
        const link = menu.appendChild(new Element("a", { dropdownOption: "" }));
        link.rect = { left: 0, top: 80, width: menuWidth, height: 40 };
        link.href = "/language/change?culture=en&returnUrl=%2Fbackend";
        const linkText = link.appendChild(new Element("span"));
        return { root, trigger, triggerText, menu, button, buttonText, disabledOption, link, linkText,
            addOption() {
                const option = new Element("button", { dropdownOption: "" });
                option.rect = { left: 0, top: menu.children.length * 40, width: menuWidth, height: 40 };
                return menu.appendChild(option);
            },
            open() { root.open = true; document.emit("toggle", root); },
            close() { root.open = false; document.emit("toggle", root); },
            key(key, target = document.activeElement || trigger) { return document.emit("keydown", target, { key }); }
        };
    }
    if (autoLoad) load();
    return { document, window, load, createDropdown, frames, topLayer, animations,
        viewport(width, height) { window.innerWidth = document.documentElement.clientWidth = window.visualViewport.width = width; window.innerHeight = document.documentElement.clientHeight = window.visualViewport.height = height; },
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

test("pointer and focus close appropriate instances while resize preserves and repositions the open select", () => {
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
    first.root.rect.left = 740;
    f.window.emit("resize");
    assert.equal(first.root.open, true);
    assert.equal(first.menu.style.left, "592px");
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

test("start/end alignment and upward preference form four independent combinations in LTR and RTL", () => {
    for (const direction of ["ltr", "rtl"])
        for (const alignEnd of [false, true])
            for (const upward of [false, true]) {
                const f = fixture();
                const item = f.createDropdown({ direction, alignEnd, upward, rect: { left: 300, top: 260, width: 80, height: 40 }, menuWidth: 240, menuHeight: 160 });
                item.open();
                assert.equal(item.menu.style.left, (alignEnd !== (direction === "rtl") ? 140 : 300) + "px");
                assert.equal(item.menu.style.top, (upward ? 92 : 308) + "px");
                assert.equal(item.root.dataset.placement, upward ? "above" : "below");
                assert.equal(item.menu.parentElement, item.root, "positioning must not detach the menu from Blazor");
            }
});

test("insufficient space flips either vertical preference and clamps both horizontal edges", () => {
    const cases = [
        { upward: false, left: 760, top: 540, expectedLeft: 552, expectedTop: 332, placement: "above" },
        { upward: true, left: -60, top: 10, expectedLeft: 8, expectedTop: 58, placement: "below" }
    ];
    for (const scenario of cases) {
        const f = fixture();
        const item = f.createDropdown({ upward: scenario.upward, rect: { left: scenario.left, top: scenario.top, width: 80, height: 40 }, menuWidth: 240 });
        item.open();
        assert.equal(item.menu.style.left, scenario.expectedLeft + "px");
        assert.equal(item.menu.style.top, scenario.expectedTop + "px");
        assert.equal(item.root.dataset.placement, scenario.placement);
    }
});

test("narrow and short viewports limit the surface width and height within eight-pixel margins", () => {
    const f = fixture();
    f.viewport(320, 300);
    const item = f.createDropdown({ rect: { left: 270, top: 220, width: 40, height: 40 }, menuWidth: 600, menuHeight: 600 });
    item.open();
    const bounds = item.menu.getBoundingClientRect();
    assert.equal(bounds.width, 304);
    assert.equal(bounds.left, 8);
    assert.ok(bounds.top >= 8 && bounds.bottom <= 292);
    assert.equal(item.root.dataset.placement, "above");
    assert.ok(item.menu.scrollHeight > item.menu.clientHeight, "long options require an internally scrollable surface");
});

test("a zoomed visual viewport smaller than the CSS minimum still keeps both eight-pixel margins", () => {
    const f = fixture();
    Object.assign(f.window.visualViewport, { width: 160, height: 300 });
    const item = f.createDropdown({ rect: { left: 20, top: 80, width: 100, height: 40 } });
    item.open();
    assert.equal(item.menu.style.minWidth, "min(10rem, 144px)");
    assert.equal(item.menu.style.maxWidth, "144px");
    const bounds = item.menu.getBoundingClientRect();
    assert.equal(bounds.width, 144);
    assert.equal(bounds.left, 8);
    assert.equal(bounds.right, 152);
});

test("visual viewport movement, size and alignment changes reposition without closing", () => {
    const f = fixture();
    const item = f.createDropdown({ rect: { left: 300, top: 180, width: 80, height: 40 }, menuWidth: 240, menuHeight: 100 });
    item.open();
    f.flushFrame();
    item.root.dataset.alignEnd = "true";
    f.flushFrame();
    assert.equal(item.menu.style.left, "140px");
    item.root.direction = "rtl";
    f.flushFrame();
    assert.equal(item.menu.style.left, "300px");
    Object.assign(f.window.visualViewport, { width: 320, height: 240, offsetLeft: 100, offsetTop: 100 });
    f.window.visualViewport.emit("resize");
    const bounds = item.menu.getBoundingClientRect();
    assert.ok(bounds.left >= 108 && bounds.right <= 412);
    assert.ok(bounds.top >= 108 && bounds.bottom <= 332);
    assert.equal(item.root.open, true);
    assert.equal(f.frames.size, 1);
});

test("native details and real links remain usable when Popover is unavailable", () => {
    const f = fixture({ autoLoad: false, popover: false });
    const item = f.createDropdown();
    item.open();
    assert.equal(item.root.open, true);
    assert.equal(item.link.href, "/language/change?culture=en&returnUrl=%2Fbackend");
    f.load();
    assert.equal(item.root.open, true);
    assert.equal(f.topLayer.size, 0);
    assert.equal(item.menu.getBoundingClientRect().left, 40);
    assert.equal(item.menu.getBoundingClientRect().top, 128);
    const event = f.document.emit("click", item.linkText, { ctrlKey: true });
    assert.equal(event.prevented, false);
    assert.equal(event.stopped, false);
    assert.equal(item.root.open, false);
});

test("End/Home and arrow navigation scroll only the option surface to reveal the focused item", () => {
    const f = fixture();
    f.viewport(800, 300);
    const item = f.createDropdown({ menuHeight: 920 });
    let last;
    for (let index = 0; index < 20; index++) last = item.addOption();
    item.trigger.focus();
    item.key("ArrowDown");
    assert.equal(f.document.activeElement, item.button);
    item.key("End");
    assert.equal(f.document.activeElement, last);
    assert.ok(item.menu.scrollTop > 0);
    assert.ok(last.getBoundingClientRect().bottom <= item.menu.getBoundingClientRect().bottom);
    const endScroll = item.menu.scrollTop;
    item.key("Home");
    assert.equal(f.document.activeElement, item.button);
    assert.equal(item.menu.scrollTop, 0);
    item.key("ArrowUp");
    assert.equal(f.document.activeElement, last);
    assert.equal(item.menu.scrollTop, endScroll);
    assert.equal(f.document.body.scrollTop, 0, "keyboard navigation must leave page scrolling alone");
});

test("resizing a long open select keeps its already-focused final option visible", () => {
    const f = fixture();
    const item = f.createDropdown({ menuHeight: 920 });
    let last;
    for (let index = 0; index < 20; index++) last = item.addOption();
    item.trigger.focus();
    item.key("End");
    const previous = item.menu.scrollTop;
    f.viewport(800, 300);
    f.window.emit("resize");
    assert.equal(item.root.open, true);
    assert.equal(f.document.activeElement, last);
    assert.ok(item.menu.scrollTop > previous);
    assert.ok(last.getBoundingClientRect().bottom <= item.menu.getBoundingClientRect().bottom);
});

test("surface fades in for 180ms and fades out inert for 140ms after native details closes", async () => {
    const f = fixture({ surfaceAnimations: true });
    const item = f.createDropdown();
    item.open();
    const incoming = f.animations.at(-1);
    assert.equal(incoming.options.duration, 180);
    assert.equal(Number(incoming.keyframes[0].opacity), 0);
    assert.equal(Number(incoming.keyframes.at(-1).opacity), 1);
    incoming.finish();
    await new Promise(setImmediate);
    item.close();
    const outgoing = f.animations.at(-1);
    assert.equal(outgoing.options.duration, 140);
    assert.equal(item.root.open, false);
    assert.equal(item.root.classList.contains("is-closing"), true);
    assert.equal(item.menu.inert, true);
    assert.equal(f.topLayer.has(item.menu), true);
    assert.equal(f.frames.size, 1, "closing must keep a frame for disabled/disconnected cleanup");
    outgoing.finish();
    await new Promise(setImmediate);
    assert.equal(item.root.classList.contains("is-closing"), false);
    assert.equal(item.menu.inert, false);
    assert.equal(f.topLayer.has(item.menu), false);
    assert.equal(f.frames.size, 0);
});

test("closing during entry and reopening during exit reverse from the current opacity", async () => {
    const f = fixture({ surfaceAnimations: true });
    const item = f.createDropdown();
    item.open();
    const incoming = f.animations.at(-1);
    incoming.sample(.42);
    item.close();
    const outgoing = f.animations.at(-1);
    assert.equal(incoming.cancelled, true);
    assert.equal(Number(outgoing.keyframes[0].opacity), .42);
    outgoing.sample(.17);
    item.open();
    const reopened = f.animations.at(-1);
    assert.equal(outgoing.cancelled, true);
    assert.equal(Number(reopened.keyframes[0].opacity), .17);
    assert.equal(item.root.classList.contains("is-closing"), false);
    assert.equal(item.menu.inert, false);
    outgoing.finish();
    await new Promise(setImmediate);
    assert.equal(item.root.open, true);
    assert.equal(f.topLayer.has(item.menu), true);
    assert.equal(f.frames.size, 1);
});

test("a resolved exit whose completion callback is pending cannot close a reopened select", async () => {
    const f = fixture({ surfaceAnimations: true });
    const item = f.createDropdown();
    item.open();
    item.close();
    const outgoing = f.animations.at(-1);
    outgoing.finish();
    item.open();
    await new Promise(setImmediate);
    assert.equal(item.root.open, true);
    assert.equal(item.menu.inert, false);
    assert.equal(f.topLayer.has(item.menu), true);
});

test("repeated close events do not restart the exit or extend its lifetime", async () => {
    const f = fixture({ surfaceAnimations: true });
    const item = f.createDropdown();
    item.open();
    item.close();
    const count = f.animations.length;
    const outgoing = f.animations.at(-1);
    item.close();
    f.document.emit("pointerdown", f.document.body);
    assert.equal(f.animations.length, count);
    outgoing.finish();
    await new Promise(setImmediate);
    assert.equal(f.topLayer.size, 0);
    assert.equal(f.frames.size, 0);
});

test("reduced motion skips surface animations and clears closing state immediately", () => {
    const f = fixture({ surfaceAnimations: true, reducedMotion: true });
    const item = f.createDropdown();
    item.open();
    assert.equal(f.animations.length, 0);
    item.close();
    assert.equal(f.animations.length, 0);
    assert.equal(item.root.classList.contains("is-closing"), false);
    assert.equal(item.menu.inert, false);
    assert.equal(f.topLayer.size, 0);
    assert.equal(f.frames.size, 0);
});

test("browsers without details-content styling immediately close instead of retaining a hidden fading popup", async () => {
    const f = fixture({ surfaceAnimations: true, detailsContent: false });
    const item = f.createDropdown();
    item.open();
    f.animations.at(-1).finish();
    await new Promise(setImmediate);
    const count = f.animations.length;
    item.close();
    assert.equal(f.animations.length, count);
    assert.equal(item.root.open, false);
    assert.equal(item.root.classList.contains("is-closing"), false);
    assert.equal(f.topLayer.size, 0);
    assert.equal(f.frames.size, 0);
});

test("disabled or removed roots cancel opening and closing surfaces on the next tracker frame", async () => {
    for (const phase of ["opening", "closing"])
        for (const action of ["disabled", "removed"]) {
            const f = fixture({ surfaceAnimations: true });
            const item = f.createDropdown();
            item.open();
            if (phase === "closing") item.close();
            const animation = f.animations.at(-1);
            if (action === "disabled") item.root.dataset.disabled = "true";
            else item.root.remove();
            f.flushFrame();
            assert.equal(animation.cancelled, true, `${action} during ${phase}`);
            assert.equal(item.root.open, false);
            assert.equal(item.root.classList.contains("is-closing"), false);
            assert.equal(item.menu.inert, false);
            assert.equal(f.topLayer.size, 0);
            assert.equal(f.frames.size, 0);
            animation.finish();
            await new Promise(setImmediate);
            if (action === "removed") f.document.body.appendChild(item.root);
            else item.root.dataset.disabled = "false";
            item.open();
            assert.equal(item.root.open, true);
            assert.equal(f.topLayer.size, 1);
            assert.equal(f.frames.size, 1);
        }
});

test("a native popover close synchronizes details and cancels its surface animation", () => {
    const f = fixture({ surfaceAnimations: true });
    const item = f.createDropdown();
    item.open();
    const animation = f.animations.at(-1);
    item.menu.hidePopover();
    f.document.emit("toggle", item.menu, { newState: "closed" });
    assert.equal(item.root.open, false);
    assert.equal(animation.cancelled, true);
    assert.equal(f.topLayer.size, 0);
    assert.equal(f.frames.size, 0);
});

test("exit animation does not consume a selected button callback or a native modified link", () => {
    for (const target of ["buttonText", "linkText"]) {
        const f = fixture({ surfaceAnimations: true });
        const item = f.createDropdown();
        item.open();
        const event = f.document.emit("click", item[target], { ctrlKey: true });
        assert.equal(event.prevented, false);
        assert.equal(event.stopped, false);
        assert.equal(item.root.open, false);
        assert.equal(item.menu.inert, true);
        assert.equal(item.link.href, "/language/change?culture=en&returnUrl=%2Fbackend");
    }
});

test("the non-Popover fallback retains only the inert closing surface until exit completion", async () => {
    const f = fixture({ surfaceAnimations: true, popover: false });
    const item = f.createDropdown();
    item.open();
    item.close();
    assert.equal(item.root.open, false);
    assert.equal(item.root.classList.contains("is-closing"), true);
    assert.equal(item.menu.inert, true);
    assert.equal(f.topLayer.size, 0);
    f.animations.at(-1).finish();
    await new Promise(setImmediate);
    assert.equal(item.root.classList.contains("is-closing"), false);
    assert.equal(item.menu.inert, false);
    assert.equal(f.frames.size, 0);
});
