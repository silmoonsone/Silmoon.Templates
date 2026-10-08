const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const componentsRoot = process.env.FFWEB_COMPONENTS_ROOT || path.join(__dirname, "..", "..", "Silmoon.Templates", "content", "Silmoon.AspNetCore.FullFunctionTemplate", "Components");
const source = fs.readFileSync(path.join(componentsRoot, "ConfirmDialog.razor.js"), "utf8");

function createFixture(options = {}) {
    const observers = [];
    const dialogs = [];
    const focusCalls = [];
    let document;
    let failuresLeft = options.showModalFailures || 0;

    class Events {
        constructor() { this.listeners = new Map(); }
        addEventListener(name, callback, settings) {
            if (!this.listeners.has(name)) this.listeners.set(name, new Map());
            this.listeners.get(name).set(callback, settings?.once === true);
        }
        removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
        emit(name, target = this, properties = {}) {
            const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...properties };
            for (const [callback, once] of [...(this.listeners.get(name) || [])]) {
                if (once) this.removeEventListener(name, callback);
                callback(event);
            }
            return event;
        }
        listenerCount() { return [...this.listeners.values()].reduce((total, handlers) => total + handlers.size, 0); }
    }

    class Element extends Events {
        constructor(tagName, dataset = {}) {
            super();
            this.tagName = tagName;
            this.dataset = dataset;
            this.children = [];
            this.parent = null;
            this.textContent = "";
            this.hidden = false;
            this.disabled = false;
            this.layoutVisible = true;
            this.visibility = "visible";
            this.style = {};
            this.attributes = {};
            this.capturedPointer = null;
        }
        get isConnected() { return this === document.body || this.parent?.isConnected === true; }
        get parentElement() { return this.parent; }
        getClientRects() { return this.isConnected && !this.hidden && this.layoutVisible ? [{}] : []; }
        setAttribute(name, value) { this.attributes[name] = value; }
        getBoundingClientRect() { return { left: parseFloat(this.style.left ?? "250"), top: parseFloat(this.style.top ?? "180"), width: 400, height: 240 }; }
        setPointerCapture(id) { this.capturedPointer = id; }
        hasPointerCapture(id) { return this.capturedPointer === id; }
        releasePointerCapture(id) { assert.equal(this.capturedPointer, id); this.capturedPointer = null; this.emit("lostpointercapture", this, { pointerId: id }); }
        set innerHTML(_) { assert.fail("Confirmation content must not be parsed as HTML."); }
        appendChild(child) {
            if (child.parent) child.parent.children = child.parent.children.filter(item => item !== child);
            child.parent = this;
            this.children.push(child);
            return child;
        }
        contains(element) { return this === element || this.children.some(child => child.contains(element)); }
        closest(selector) { return this.tagName === selector ? this : this.parent?.closest(selector); }
        querySelector(selector) {
            const key = selector.startsWith("[data-") ? selector.slice(6, -1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) : null;
            for (const child of this.children) {
                if (key ? Object.hasOwn(child.dataset, key) : child.tagName === selector) return child;
                const found = child.querySelector(selector);
                if (found) return found;
            }
            return null;
        }
        focus() { document.activeElement = this; focusCalls.push(this); }
        remove() {
            if (!this.parent) return;
            this.parent.children = this.parent.children.filter(child => child !== this);
            this.parent = null;
            for (const observer of observers) {
                if (observer.connected) queueMicrotask(() => { if (observer.connected) observer.callback(); });
            }
        }
    }

    class Dialog extends Element {
        constructor() {
            super("dialog");
            this.open = false;
            this.showCount = 0;
            this.closeCount = 0;
            this.header = this.appendChild(new Element("header"));
            this.header.appendChild(new Element("h2", { confirmTitle: "" }));
            this.appendChild(new Element("p", { confirmMessage: "" }));
            this.dismiss = this.header.appendChild(new Element("button", { confirmCancel: "" }));
            this.actions = this.appendChild(new Element("footer"));
            this.cancel = this.actions.appendChild(new Element("button", { confirmCancel: "", confirmCancelLabel: "" }));
            this.alternative = this.actions.appendChild(new Element("button", { confirmAlternative: "" }));
            this.alternative.hidden = true;
            this.accept = this.actions.appendChild(new Element("button", { confirmAccept: "" }));
            if (options.unsupported) this.showModal = undefined;
        }
        cloneNode(deep) {
            assert.equal(deep, true);
            const clone = new Dialog();
            dialogs.push(clone);
            return clone;
        }
        showModal() {
            this.showCount++;
            assert.equal(this.isConnected, true);
            if (failuresLeft-- > 0) throw new Error("showModal failed");
            this.open = true;
        }
        close() { this.closeCount++; this.open = false; this.emit("close"); }
    }

    class MutationObserver {
        constructor(callback) { this.callback = callback; this.connected = false; observers.push(this); }
        observe(target, settings) {
            assert.equal(target, document.body);
            assert.equal(settings.childList, true);
            this.connected = true;
        }
        disconnect() { this.connected = false; }
    }

    const templateDialog = new Dialog();
    const content = new Element("fragment");
    content.appendChild(templateDialog);
    const template = { id: "site-confirm-dialog-template", content };
    if (options.interactiveTemplate) {
        template.content = new Element("fragment");
        template.querySelector = selector => content.querySelector(selector);
    }
    document = {
        body: new Element("body"), activeElement: null,
        getElementById(id) { assert.equal(id, "site-confirm-dialog-template"); return options.missingTemplate ? null : template; }
    };
    const window = new Events();
    window.innerWidth = 1000;
    window.innerHeight = 700;
    window.getComputedStyle = element => ({ visibility: element.visibility });
    const context = vm.createContext({ window, document, MutationObserver, console });
    vm.runInContext(source, context, { filename: "ConfirmDialog.razor.js" });
    return {
        confirm: window.SiteDialogs.confirm, choose: window.SiteDialogs.choose, dismiss: window.SiteDialogs.dismiss, template, document, window, dialogs, observers, focusCalls,
        reload: () => vm.runInContext(source, context),
        current: () => dialogs.at(-1),
        child: (dialog, key) => dialog.querySelector("[data-confirm-" + key + "]"),
        assertClean(dialog) {
            assert.equal(dialog.isConnected, false);
            assert.equal(dialog.open, false);
            assert.equal(dialog.listenerCount(), 0);
            assert.equal(dialog.header.listenerCount(), 0);
            assert.equal(dialog.header.capturedPointer, null);
            assert.equal(window.listenerCount(), 0);
            assert.equal(observers.some(observer => observer.connected), false);
            assert.equal(document.body.children.length, 0);
        }
    };
}

test("confirmation remains pending without blocking microtasks or timers and resolves only after acceptance", async () => {
    const fixture = createFixture();
    let settled = false;
    const result = fixture.confirm().then(value => { settled = true; return value; });
    assert.equal(fixture.current().open, true);
    let microtaskRan = false;
    await Promise.resolve().then(() => { microtaskRan = true; });
    let timerRan = false;
    await new Promise(resolve => setTimeout(() => { timerRan = true; resolve(); }, 0));
    assert.equal(microtaskRan && timerRan, true);
    assert.equal(settled, false);
    const dialog = fixture.current();
    dialog.emit("click", dialog.accept);
    assert.equal(await result, true);
    fixture.assertClean(dialog);
});

test("cancel button, header close, Escape cancellation and native close each resolve false and release the next dialog", async () => {
    const fixture = createFixture();
    for (const action of ["cancel", "dismiss", "escape", "close"]) {
        const result = fixture.confirm();
        const dialog = fixture.current();
        if (action === "escape") assert.equal(dialog.emit("cancel").defaultPrevented, true);
        else if (action === "close") dialog.close();
        else dialog.emit("click", dialog[action]);
        assert.equal(await result, false, action);
        assert.equal(dialog.closeCount, 1, action);
        fixture.assertClean(dialog);
    }
});

test("AbortSignal cancels an active dialog, is removed after cleanup and prevents already-aborted dialogs", async () => {
    const fixture = createFixture();
    const controller = new AbortController();
    const listeners = new Set();
    const signal = {
        get aborted() { return controller.signal.aborted; },
        addEventListener(name, callback, settings) { listeners.add(callback); controller.signal.addEventListener(name, callback, settings); },
        removeEventListener(name, callback) { listeners.delete(callback); controller.signal.removeEventListener(name, callback); }
    };
    const result = fixture.confirm({ signal });
    const dialog = fixture.current();
    assert.equal(listeners.size, 1);
    controller.abort();
    assert.equal(await result, false);
    assert.equal(listeners.size, 0);
    fixture.assertClean(dialog);
    assert.equal(await fixture.confirm({ signal }), false);
    assert.equal(fixture.dialogs.length, 1);
    const next = fixture.confirm();
    fixture.current().emit("click", fixture.current().accept);
    assert.equal(await next, true);
});

test("a duplicate confirmation returns false without replacing or completing the active dialog", async () => {
    const fixture = createFixture();
    const first = fixture.confirm({ title: "First request" });
    const dialog = fixture.current();
    assert.equal(await fixture.confirm({ title: "Second request" }), false);
    assert.equal(fixture.dialogs.length, 1);
    assert.equal(dialog.open, true);
    assert.equal(fixture.child(dialog, "title").textContent, "First request");
    dialog.emit("click", dialog.accept);
    assert.equal(await first, true);
});

test("titles, messages and button labels remain literal text and dangerous styling is explicit", async () => {
    const fixture = createFixture();
    const values = { title: "<img src=x onerror=alert(1)>", message: "<script>alert('test')</script>\nSecond line", confirmText: "<b>Accept</b>", cancelText: "<i>Cancel</i>", danger: true };
    const result = fixture.confirm(values);
    const dialog = fixture.current();
    for (const [key, field] of [["title", "title"], ["message", "message"], ["accept", "confirmText"], ["cancel-label", "cancelText"]]) {
        const element = fixture.child(dialog, key);
        assert.equal(element.textContent, values[field]);
        assert.equal(element.children.length, 0);
    }
    assert.equal(dialog.dataset.danger, "true");
    dialog.emit("click", dialog.cancel);
    assert.equal(await result, false);
    const next = fixture.confirm({ danger: "true" });
    assert.equal(fixture.current().dataset.danger, "false");
    fixture.current().emit("click", fixture.current().cancel);
    await next;
});

test("showModal failure rejects after cleanup and does not block a subsequent confirmation", async () => {
    const fixture = createFixture({ showModalFailures: 1 });
    const failed = fixture.confirm();
    const dialog = fixture.current();
    await assert.rejects(failed, /showModal failed/);
    fixture.assertClean(dialog);
    const next = fixture.confirm();
    assert.equal(fixture.current().open, true);
    fixture.current().emit("click", fixture.current().accept);
    assert.equal(await next, true);
    fixture.assertClean(fixture.current());
});

test("external DOM removal cancels through the observer and disconnects its callback", async () => {
    const fixture = createFixture();
    const result = fixture.confirm();
    const dialog = fixture.current();
    dialog.remove();
    assert.equal(await result, false);
    fixture.assertClean(dialog);
    const next = fixture.confirm();
    const nextDialog = fixture.current();
    fixture.observers[0].callback();
    assert.equal(nextDialog.open, true);
    nextDialog.emit("click", nextDialog.cancel);
    assert.equal(await next, false);
});

test("pagehide cancels only the active dialog and leaves no stale window listener", async () => {
    const fixture = createFixture();
    const result = fixture.confirm();
    const dialog = fixture.current();
    fixture.window.emit("pagehide");
    assert.equal(await result, false);
    fixture.assertClean(dialog);
    fixture.window.emit("pagehide");
    const next = fixture.confirm();
    fixture.current().emit("click", fixture.current().accept);
    assert.equal(await next, true);
});

test("initial focus is the safe cancel action and nested button targets work without accepting unrelated clicks", async () => {
    const fixture = createFixture();
    const result = fixture.confirm();
    const dialog = fixture.current();
    assert.equal(fixture.document.activeElement, dialog.cancel);
    assert.deepEqual(fixture.focusCalls, [dialog.cancel]);
    dialog.emit("click", fixture.child(dialog, "message"));
    dialog.emit("click", dialog);
    const externalButton = { closest: () => ({ dataset: { confirmAccept: "" } }) };
    dialog.emit("click", externalButton);
    assert.equal(dialog.open, true);
    dialog.emit("click", { closest: () => dialog.accept });
    assert.equal(await result, true);
    assert.equal(dialog.closeCount, 1);
    fixture.assertClean(dialog);
});

test("missing template or unsupported dialog rejects without adding DOM nodes or global listeners", async () => {
    for (const options of [{ missingTemplate: true }, { unsupported: true }]) {
        const fixture = createFixture(options);
        await assert.rejects(fixture.confirm(), /确认控件未加载/);
        assert.equal(fixture.document.body.children.length, 0);
        assert.equal(fixture.window.listenerCount(), 0);
        assert.equal(fixture.observers.length, 0);
    }
});

test("choice resolves distinct action keys, keeps labels as text and focuses cancel", async () => {
    const fixture = createFixture();
    for (const [button, action] of [["accept", "confirm"], ["alternative", "alternative"]]) {
        const result = fixture.choose({ confirmText: "<b>Accept</b>", alternativeText: "<i>Alternative</i>", danger: true });
        const dialog = fixture.current();
        assert.equal(dialog.accept.textContent, "<b>Accept</b>");
        assert.equal(dialog.alternative.textContent, "<i>Alternative</i>");
        assert.equal(dialog.alternative.children.length, 0);
        assert.equal(dialog.alternative.hidden, false);
        assert.deepEqual(dialog.actions.children, [dialog.cancel, dialog.alternative, dialog.accept]);
        assert.equal(dialog.dataset.danger, "true");
        assert.equal(fixture.document.activeElement, dialog.cancel);
        dialog.emit("click", { closest: () => dialog[button] });
        assert.equal(await result, action);
        fixture.assertClean(dialog);
    }
});

test("choice cancellation, abort, pagehide and DOM removal resolve null and release the dialog", async () => {
    const fixture = createFixture();
    for (const action of ["cancel", "dismiss", "escape", "close", "abort", "pagehide", "remove"]) {
        const controller = new AbortController();
        const result = fixture.choose({ alternativeText: "Alternative", signal: controller.signal });
        const dialog = fixture.current();
        if (action === "escape") assert.equal(dialog.emit("cancel").defaultPrevented, true);
        else if (action === "close") dialog.close();
        else if (action === "abort") controller.abort();
        else if (action === "pagehide") fixture.window.emit("pagehide");
        else if (action === "remove") dialog.remove();
        else dialog.emit("click", dialog[action]);
        assert.equal(await result, null, action);
        fixture.assertClean(dialog);
    }
    const controller = new AbortController();
    controller.abort();
    const count = fixture.dialogs.length;
    assert.equal(await fixture.choose({ signal: controller.signal }), null);
    assert.equal(fixture.dialogs.length, count);
});

test("choice and confirmation share a single active dialog and retain their result types", async () => {
    const fixture = createFixture();
    for (const method of ["choose", "confirm"]) {
        const result = fixture[method]({ title: "First request", alternativeText: "Alternative" });
        const dialog = fixture.current();
        const count = fixture.dialogs.length;
        assert.equal(await fixture.choose({ title: "Second request" }), null);
        assert.equal(await fixture.confirm({ title: "Third request" }), false);
        assert.equal(fixture.dialogs.length, count);
        assert.equal(dialog.open, true);
        assert.equal(fixture.child(dialog, "title").textContent, "First request");
        dialog.emit("click", dialog.accept);
        assert.equal(await result, method === "choose" ? "confirm" : true);
        fixture.assertClean(dialog);
    }
});

test("confirmation ignores alternative text and never accepts the alternative action", async () => {
    const fixture = createFixture();
    for (const action of ["cancel", "accept"]) {
        const result = fixture.confirm({ alternativeText: "Alternative" });
        const dialog = fixture.current();
        assert.equal(dialog.alternative.hidden, true);
        assert.equal(dialog.alternative.textContent, "");
        assert.deepEqual(dialog.actions.children, [dialog.cancel, dialog.alternative, dialog.accept]);
        dialog.emit("click", dialog.alternative);
        dialog.alternative.hidden = false;
        dialog.emit("click", dialog.alternative);
        assert.equal(dialog.open, true);
        dialog.emit("click", dialog[action]);
        assert.equal(await result, action === "accept");
        fixture.assertClean(dialog);
    }
});

test("choice hides the alternative action when its label is absent or empty", async () => {
    const fixture = createFixture();
    for (const alternativeText of [undefined, null, "", "   "]) {
        const result = fixture.choose({ alternativeText });
        const dialog = fixture.current();
        assert.equal(dialog.alternative.hidden, true);
        assert.deepEqual(dialog.actions.children, [dialog.cancel, dialog.alternative, dialog.accept]);
        dialog.emit("click", dialog.alternative);
        assert.equal(dialog.open, true);
        dialog.emit("click", dialog.cancel);
        assert.equal(await result, null);
        fixture.assertClean(dialog);
    }
});

test("hidden and disabled action buttons cannot complete a dialog", async () => {
    const fixture = createFixture();
    for (const button of ["accept", "alternative", "cancel"]) {
        for (const [property, value] of [["disabled", true], ["hidden", true], ["layoutVisible", false], ["visibility", "hidden"]]) {
            const result = fixture.choose({ alternativeText: "Alternative" });
            const dialog = fixture.current();
            dialog[button][property] = value;
            dialog.emit("click", dialog[button]);
            assert.equal(dialog.open, true, `${button}.${property}`);
            dialog.emit("cancel");
            assert.equal(await result, null);
            fixture.assertClean(dialog);
        }
    }
});

test("choice rejects unsupported or failed dialogs and releases failed instances", async () => {
    for (const options of [{ missingTemplate: true }, { unsupported: true }]) {
        const fixture = createFixture(options);
        await assert.rejects(fixture.choose(), /确认控件未加载/);
        assert.equal(fixture.document.body.children.length, 0);
        assert.equal(fixture.window.listenerCount(), 0);
    }
    const fixture = createFixture({ showModalFailures: 1 });
    await assert.rejects(fixture.choose(), /showModal failed/);
    fixture.assertClean(fixture.current());
    const next = fixture.choose({ alternativeText: "Alternative" });
    fixture.current().emit("click", fixture.current().alternative);
    assert.equal(await next, "alternative");
    fixture.assertClean(fixture.current());
});

function pointer(header, type, properties = {}, target = header) {
    return header.emit(type, target, { pointerId: 7, button: 0, isPrimary: true, clientX: 300, clientY: 200, ...properties });
}

test("header drag moves the dialog, captures the pointer and does not complete the confirmation", async () => {
    const fixture = createFixture();
    const result = fixture.confirm();
    const dialog = fixture.current();
    assert.equal(pointer(dialog.header, "pointerdown").defaultPrevented, true);
    assert.equal(dialog.header.capturedPointer, 7);
    pointer(dialog.header, "pointermove", { clientX: 440, clientY: 290 });
    assert.equal(dialog.style.left, "390px");
    assert.equal(dialog.style.top, "270px");
    assert.equal(dialog.dataset.dragged, "true");
    assert.equal(dialog.open, true);
    pointer(dialog.header, "pointerup");
    assert.equal(dialog.header.capturedPointer, null);
    pointer(dialog.header, "pointermove", { clientX: 800 });
    assert.equal(dialog.style.left, "390px");
    dialog.emit("click", dialog.accept);
    assert.equal(await result, true);
    fixture.assertClean(dialog);
});

test("drag ignores close buttons, secondary buttons, additional pointers and can be disabled", async () => {
    const fixture = createFixture();
    const result = fixture.confirm();
    const dialog = fixture.current();
    for (const [properties, target] of [[{}, dialog.dismiss], [{ button: 2 }, dialog.header], [{ isPrimary: false }, dialog.header]]) {
        assert.equal(pointer(dialog.header, "pointerdown", properties, target).defaultPrevented, false);
        pointer(dialog.header, "pointermove", { clientX: 500 });
        assert.equal(dialog.dataset.dragged, undefined);
    }
    pointer(dialog.header, "pointerdown");
    pointer(dialog.header, "pointermove", { pointerId: 8, clientX: 500 });
    pointer(dialog.header, "pointerup", { pointerId: 8 });
    assert.equal(dialog.dataset.dragged, undefined);
    assert.equal(dialog.header.capturedPointer, 7);
    dialog.emit("click", dialog.dismiss);
    assert.equal(await result, false);
    fixture.assertClean(dialog);
    const disabled = fixture.confirm({ draggable: false });
    const second = fixture.current();
    assert.equal(second.header.listenerCount(), 0);
    assert.equal(second.dataset.dragged, undefined);
    second.emit("click", second.cancel);
    assert.equal(await disabled, false);
    fixture.assertClean(second);
});

test("drag clamps to viewport, stops on resize and resets for a new dialog", async () => {
    const fixture = createFixture();
    const result = fixture.confirm();
    const dialog = fixture.current();
    pointer(dialog.header, "pointerdown");
    pointer(dialog.header, "pointermove", { clientX: -1000, clientY: -1000 });
    assert.equal(dialog.style.left, "8px");
    assert.equal(dialog.style.top, "8px");
    pointer(dialog.header, "pointermove", { clientX: 5000, clientY: 5000 });
    assert.equal(dialog.style.left, "592px");
    assert.equal(dialog.style.top, "452px");
    fixture.window.innerWidth = 700;
    fixture.window.innerHeight = 500;
    fixture.window.emit("resize");
    assert.equal(dialog.style.left, "292px");
    assert.equal(dialog.style.top, "252px");
    assert.equal(dialog.header.capturedPointer, null);
    dialog.emit("cancel");
    await result;
    fixture.assertClean(dialog);
    const next = fixture.confirm();
    assert.deepEqual(fixture.current().style, {});
    assert.equal(fixture.current().dataset.dragged, undefined);
    fixture.current().emit("cancel");
    await next;
});

test("cancelled pointer, capture loss, blur and aborted dialogs release dragging", async () => {
    const fixture = createFixture();
    for (const action of ["pointercancel", "lostpointercapture", "blur", "abort", "remove"]) {
        const controller = new AbortController();
        const result = fixture.confirm({ signal: controller.signal });
        const dialog = fixture.current();
        pointer(dialog.header, "pointerdown");
        if (action === "blur") fixture.window.emit("blur");
        else if (action === "abort") controller.abort();
        else if (action === "remove") { dialog.remove(); await result; }
        else pointer(dialog.header, action);
        assert.equal(dialog.header.capturedPointer, null, action);
        pointer(dialog.header, "pointermove", { clientX: 500 });
        assert.equal(dialog.dataset.dragged, undefined);
        if (dialog.open) dialog.emit("cancel");
        assert.equal(await result, false);
        fixture.assertClean(dialog);
    }
});

test("Blazor uses its own template and disposing another instance cannot dismiss its dialog", async () => {
    const fixture = createFixture({ missingTemplate: true });
    const result = fixture.choose({ alternativeText: "Other" }, fixture.template);
    const dialog = fixture.current();
    fixture.dismiss("another-component");
    assert.equal(dialog.open, true);
    assert.equal(dialog.attributes["aria-labelledby"], fixture.child(dialog, "title").id);
    assert.equal(dialog.attributes["aria-describedby"], fixture.child(dialog, "message").id);
    fixture.dismiss(fixture.template.id);
    assert.equal(await result, null);
    fixture.assertClean(dialog);
});

test("loading through both a script tag and a Blazor import preserves the active dialog", async () => {
    const fixture = createFixture();
    const result = fixture.confirm();
    const dialog = fixture.current();
    fixture.reload();
    assert.equal(await fixture.window.SiteDialogs.confirm(), false);
    assert.equal(fixture.current(), dialog);
    dialog.emit("click", dialog.accept);
    assert.equal(await result, true);
    fixture.assertClean(dialog);
});

test("interactive Blazor template children are supported alongside parsed HTML template content", async () => {
    const fixture = createFixture({ interactiveTemplate: true, missingTemplate: true });
    const result = fixture.confirm({}, fixture.template);
    const dialog = fixture.current();
    assert.equal(dialog.open, true);
    fixture.dismiss(fixture.template.id);
    assert.equal(await result, false);
    fixture.assertClean(dialog);
});
