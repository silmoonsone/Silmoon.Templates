const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const componentsRoot = process.env.FFWEB_COMPONENTS_ROOT || path.join(__dirname, "..", "..", "Silmoon.Templates", "content", "Silmoon.AspNetCore.FullFunctionTemplate", "Components");
const source = fs.readFileSync(path.join(componentsRoot, "DateTimeRangePicker.razor.js"), "utf8");
const presetLabels = { today: "今天", yesterday: "昨天", threeDays: "近三天", thisWeek: "本周", lastWeek: "上周", thisMonth: "本月", lastMonth: "上月", threeMonths: "三个月", sixMonths: "半年", oneYear: "一年", all: "全部" };

function fixture(now = "2026-10-06T12:34:56.789+08:00", includeTime = true, options = {}) {
    class Element extends EventTarget {
        constructor(dataset = {}) { super(); this.dataset = dataset; this.attributes = {}; this.value = ""; this.textContent = ""; this.hidden = false; this.disabled = false; this.open = false; }
        setAttribute(name, value) { this.attributes[name] = value; }
        closest(selector) { return selector === "button" ? this : null; }
        contains(element) { return elements.includes(element); }
        focus() { focused = this; }
        showModal() { this.open = true; }
        close() { this.open = false; this.dispatchEvent(new Event("close")); }
    }
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return new Date(now).getTime(); }
    }
    let focused = null;
    const root = new Element();
    const trigger = new Element();
    const dialog = new Element();
    const form = new Element();
    const start = new Element();
    const end = new Element();
    start.type = end.type = includeTime ? "datetime-local" : "date";
    const error = new Element();
    const cancel = new Element({ dateRangeCancel: "" });
    const apply = new Element({ dateRangeApply: "" });
    const presets = Object.entries(presetLabels).map(([key, label]) => { const item = new Element({ dateRangePreset: key }); item.textContent = label; return item; });
    const controls = [trigger, start, end, cancel, apply, ...presets];
    const elements = [dialog, form, error, ...controls];
    const selectors = { open: trigger, dialog, form, start, end, error };
    root.querySelector = selector => selectors[selector.slice("[data-date-range-".length, -1)] || null;
    root.querySelectorAll = selector => selector === "[data-date-range-preset]" ? presets : selector === "button, input" ? controls : [];
    const window = new EventTarget();
    vm.runInNewContext(source, { window, AbortController, Date: Clock });
    const applied = [];
    const onApply = range => {
        if (!options.blazor) assert.equal(dialog.open, false);
        applied.push(range ? JSON.parse(JSON.stringify(range)) : null);
        return options.onApply?.(range);
    };
    const picker = options.blazor ? window.DateTimeRangePicker.mountBlazor(root, { invokeMethodAsync(method, range) { assert.equal(method, "ApplyRangeAsync"); return onApply(range); } }) : window.DateTimeRangePicker.mount(root, { onApply });
    function click(button, container = dialog) {
        const event = new Event("click", { cancelable: true });
        Object.defineProperty(event, "target", { value: button });
        container.dispatchEvent(event);
    }
    return {
        picker, trigger, dialog, form, start, end, error, presets, applied, window, root, controls,
        open() { click(trigger, trigger); },
        choose(key) { click(presets.find(button => button.dataset.dateRangePreset === key)); },
        submit() { form.dispatchEvent(new Event("submit", { cancelable: true })); },
        confirm() { click(apply); },
        cancel() { click(cancel); },
        input(element, value) { element.value = value; element.dispatchEvent(new Event("input")); },
        focused() { return focused; }
    };
}

function withTimezone(timezone, action) {
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try { action(); }
    finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
}

const expected = {
    today: ["2026-10-06", "2026-10-06"], yesterday: ["2026-10-05", "2026-10-05"], threeDays: ["2026-10-04", "2026-10-06"],
    thisWeek: ["2026-10-05", "2026-10-06"], lastWeek: ["2026-09-28", "2026-10-04"], thisMonth: ["2026-10-01", "2026-10-06"],
    lastMonth: ["2026-09-01", "2026-09-30"], threeMonths: ["2026-07-06", "2026-10-06"], sixMonths: ["2026-04-06", "2026-10-06"], oneYear: ["2025-10-06", "2026-10-06"]
};

for (const [preset, dates] of Object.entries(expected)) {
    for (const includeTime of [true, false]) test(preset + (includeTime ? " date-time" : " date-only") + " uses local calendar boundaries and only applies after confirmation", () => withTimezone("Asia/Shanghai", () => {
        const f = fixture(undefined, includeTime);
        f.open();
        f.choose(preset);
        assert.equal(f.applied.length, 0);
        assert.equal(f.start.value, dates[0] + (includeTime ? "T00:00:00.000" : ""));
        assert.equal(f.end.value, dates[1] + (includeTime ? "T23:59:59.999" : ""));
        f.submit();
        assert.deepEqual(f.applied, [{ startTime: new Date(dates[0] + "T00:00:00.000+08:00").toISOString(), endTime: new Date(dates[1] + "T23:59:59.999+08:00").toISOString(), label: presetLabels[preset] }]);
        assert.equal(f.trigger.dataset.filtered, undefined);
        f.picker.setValue(f.applied[0]);
        assert.equal(f.trigger.dataset.filtered, "true");
        assert.ok(f.trigger.title.includes(dates[0]) && f.trigger.title.includes(dates[1]));
        if (includeTime) assert.match(f.trigger.title, /00:00:00\.000.*23:59:59\.999/);
        else assert.doesNotMatch(f.trigger.title, /\d{2}:\d{2}|\.999/);
        f.picker.dispose();
    }));
}

test("cancel and Escape discard draft and retain committed range", () => withTimezone("Asia/Shanghai", () => {
    const f = fixture();
    f.open(); f.choose("today"); f.submit(); f.picker.setValue(f.applied[0]);
    f.open(); f.choose("lastMonth"); f.cancel();
    f.open(); assert.equal(f.start.value, "2026-10-06T00:00:00.000");
    f.choose("yesterday"); f.dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    assert.equal(f.dialog.open, false);
    assert.equal(f.applied.length, 1);
    f.open(); assert.equal(f.start.value, "2026-10-06T00:00:00.000");
    f.picker.dispose();
}));

test("all resets only on confirmation; custom inputs are local times", () => withTimezone("Asia/Shanghai", () => {
    const f = fixture();
    f.open();
    f.input(f.start, "2026-10-01T10:20"); f.input(f.end, "2026-10-02T12:30:45.12");
    f.submit();
    assert.deepEqual(f.applied[0], { startTime: "2026-10-01T02:20:00.000Z", endTime: "2026-10-02T04:30:45.120Z", label: "自定义" });
    f.picker.setValue(f.applied[0]);
    f.open(); f.choose("all"); assert.equal(f.applied.length, 1); f.submit();
    assert.equal(f.applied[1], null);
    assert.equal(f.trigger.dataset.filtered, "true");
    f.picker.setValue(null); assert.equal(f.trigger.dataset.filtered, "false");
    assert.match(f.trigger.title, /全部时段$/);
    f.picker.dispose();
}));

test("date-only custom ranges include both entire local dates and cancel/all preserve the commit boundary", () => withTimezone("Asia/Shanghai", () => {
    const f = fixture(undefined, false);
    f.open();
    f.input(f.start, "2026-10-01"); f.input(f.end, "2026-10-02");
    assert.equal(f.applied.length, 0);
    f.submit();
    assert.deepEqual(f.applied[0], { startTime: "2026-09-30T16:00:00.000Z", endTime: "2026-10-02T15:59:59.999Z", label: "自定义" });
    f.picker.setValue(f.applied[0]);
    f.open(); f.choose("today"); f.cancel();
    f.open(); assert.equal(f.start.value, "2026-10-01"); assert.equal(f.end.value, "2026-10-02");
    f.choose("yesterday"); f.dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    f.open(); assert.equal(f.start.value, "2026-10-01"); assert.equal(f.applied.length, 1);
    f.choose("all"); assert.equal(f.applied.length, 1); f.submit();
    assert.equal(f.applied[1], null);
    assert.equal(f.trigger.dataset.filtered, "true");
    f.picker.setValue(null); assert.equal(f.trigger.dataset.filtered, "false");
    assert.match(f.trigger.title, /全部时段$/);
    f.open(); assert.equal(f.start.value, ""); assert.equal(f.end.value, "");
    f.picker.dispose();
}));

test("date-only rejects missing, non-calendar, reversed and unsupported UTC dates", () => withTimezone("Asia/Shanghai", () => {
    const f = fixture(undefined, false);
    f.open();
    for (const [start, end] of [["", "2026-10-06"], ["2026-02-30", "2026-10-06"], ["2026-10-07", "2026-10-06"], ["0000-01-01", "2026-10-06"], ["0001-01-01", "2026-10-06"], ["2026-10-06", "10000-01-01"], ["2026-10-06T12:00", "2026-10-07"]]) {
        f.input(f.start, start); f.input(f.end, end); f.submit();
        assert.equal(f.dialog.open, true);
        assert.equal(f.error.hidden, false);
        assert.equal(f.applied.length, 0);
    }
    f.input(f.start, "2024-02-29"); f.input(f.end, "2024-02-29"); f.submit();
    assert.deepEqual(f.applied[0], { startTime: "2024-02-28T16:00:00.000Z", endTime: "2024-02-29T15:59:59.999Z", label: "自定义" });
    f.picker.dispose();
}));

test("date-only checks the UTC end boundary and does not reinterpret years 1 through 99 as 1900", () => withTimezone("America/New_York", () => {
    const f = fixture(undefined, false);
    f.open();
    f.input(f.start, "9999-12-30"); f.input(f.end, "9999-12-31"); f.submit();
    assert.equal(f.applied.length, 0); assert.equal(f.error.hidden, false);
    f.input(f.start, "0002-01-02"); f.input(f.end, "0002-01-02"); f.submit();
    assert.equal(f.applied.length, 1);
    assert.equal(new Date(f.applied[0].startTime).getFullYear(), 2);
    assert.equal(new Date(f.applied[0].endTime).getFullYear(), 2);
    f.picker.dispose();
}));

test("missing, invalid and reversed dates keep dialog open without callback", () => withTimezone("Asia/Shanghai", () => {
    const f = fixture();
    f.open();
    for (const [start, end] of [["", "2026-10-06T12:30"], ["2026-02-30T12:00", "2026-10-06T12:30"], ["2026-10-07T00:00", "2026-10-06T12:30"], ["0000-01-01T00:00", "2026-10-06T12:30"], ["0001-01-01T00:00", "2026-10-06T12:30"]]) {
        f.input(f.start, start); f.input(f.end, end); f.submit();
        assert.equal(f.dialog.open, true);
        assert.equal(f.error.hidden, false);
        assert.equal(f.applied.length, 0);
    }
    f.picker.dispose();
}));

test("month/year presets clamp month ends and leap day", () => withTimezone("Asia/Shanghai", () => {
    for (const [now, preset, start] of [["2026-05-31T12:00+08:00", "threeMonths", "2026-02-28"], ["2024-02-29T12:00+08:00", "oneYear", "2023-02-28"], ["2024-08-31T12:00+08:00", "sixMonths", "2024-02-29"]]) {
        const f = fixture(now); f.open(); f.choose(preset);
        assert.equal(f.start.value, start + "T00:00:00.000"); f.picker.dispose();
    }
}));

test("DST spring/fall days use calendar days rather than 24-hour durations", () => withTimezone("America/New_York", () => {
    for (const [now, hours] of [["2026-03-08T12:00-04:00", 23], ["2026-11-01T12:00-05:00", 25]]) {
        const f = fixture(now); f.open(); f.choose("today"); f.submit();
        assert.equal(new Date(f.applied[0].endTime) - new Date(f.applied[0].startTime) + 1, hours * 3600000); f.picker.dispose();
    }
    const f = fixture("2026-03-08T12:00-04:00"); f.open();
    f.input(f.start, "2026-03-08T02:30"); f.input(f.end, "2026-03-08T04:00"); f.submit();
    assert.equal(f.applied.length, 0); assert.equal(f.error.hidden, false); f.picker.dispose();
}));

test("date-only manual and preset DST days include 23 or 25 hours instead of fixed 24 hours", () => withTimezone("America/New_York", () => {
    for (const [now, date, hours] of [["2026-03-08T12:00-04:00", "2026-03-08", 23], ["2026-11-01T12:00-05:00", "2026-11-01", 25]]) {
        const f = fixture(now, false); f.open(); f.choose("today"); f.submit();
        f.open(); f.input(f.start, date); f.input(f.end, date); f.submit();
        assert.equal(f.applied.length, 2);
        assert.equal(f.applied[0].startTime, f.applied[1].startTime);
        assert.equal(f.applied[0].endTime, f.applied[1].endTime);
        assert.equal(new Date(f.applied[1].endTime) - new Date(f.applied[1].startTime) + 1, hours * 3600000);
        const start = new Date(f.applied[1].startTime), end = new Date(f.applied[1].endTime);
        assert.deepEqual([start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds()], [0, 0, 0, 0]);
        assert.deepEqual([end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()], [23, 59, 59, 999]);
        f.picker.dispose();
    }
}));

test("date-only accepts a real calendar day whose first valid local time is 01:00", () => withTimezone("America/Santiago", () => {
    const f = fixture("2026-09-06T12:00-03:00", false);
    f.open(); f.choose("today"); f.submit();
    f.open(); f.input(f.start, "2026-09-06"); f.input(f.end, "2026-09-06"); f.submit();
    assert.equal(f.applied.length, 2);
    for (const range of f.applied) {
        assert.equal(range.startTime, "2026-09-06T04:00:00.000Z");
        assert.equal(range.endTime, "2026-09-07T02:59:59.999Z");
    }
    f.open(); f.input(f.start, "2026-09-05"); f.input(f.end, "2026-09-05"); f.submit();
    assert.equal(f.applied[2].startTime, "2026-09-05T04:00:00.000Z");
    assert.equal(f.applied[2].endTime, "2026-09-06T03:59:59.999Z");
    f.picker.dispose();
}));

test("date-only rejects an entirely skipped local date and retains the previous real day's ending", () => withTimezone("Pacific/Apia", () => {
    const f = fixture("2011-12-31T12:00+14:00", false);
    f.open();
    for (const [start, end] of [["2011-12-30", "2011-12-31"], ["2011-12-29", "2011-12-30"]]) {
        f.input(f.start, start); f.input(f.end, end); f.submit();
        assert.equal(f.applied.length, 0); assert.equal(f.error.hidden, false);
    }
    f.input(f.start, "2011-12-29"); f.input(f.end, "2011-12-29"); f.submit();
    assert.equal(f.applied.length, 1);
    assert.equal(f.applied[0].startTime, "2011-12-29T10:00:00.000Z");
    assert.equal(f.applied[0].endTime, "2011-12-30T09:59:59.999Z");
    f.picker.dispose();
}));

test("pagehide closes without applying and dispose removes event handlers", () => {
    const f = fixture();
    f.open(); f.choose("today"); f.window.dispatchEvent(new Event("pagehide"));
    assert.equal(f.dialog.open, false); assert.equal(f.applied.length, 0);
    f.open(); f.picker.dispose(); f.open(); f.submit();
    assert.equal(f.dialog.open, false); assert.equal(f.applied.length, 0);
    assert.equal(f.trigger.attributes["aria-expanded"], "false");
    f.picker.dispose();
});

test("Blazor mode awaits the callback, prevents duplicate submission and commits after success", async () => {
    let finish;
    const f = fixture(undefined, false, { blazor: true, onApply: () => new Promise(resolve => { finish = resolve; }) });
    f.picker.setValue(null);
    f.open(); f.choose("today"); f.confirm();
    assert.equal(f.applied.length, 1);
    assert.equal(f.dialog.open, true);
    assert.equal(f.trigger.dataset.filtered, "false");
    assert.ok(f.controls.every(control => control.disabled));
    assert.equal(f.form.attributes["aria-busy"], "true");
    f.submit(); f.cancel(); f.dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    assert.equal(f.applied.length, 1);
    assert.equal(f.dialog.open, true);
    finish(true);
    await new Promise(setImmediate);
    assert.equal(f.dialog.open, false);
    assert.equal(f.trigger.dataset.filtered, "true");
    assert.ok(f.controls.every(control => !control.disabled));
    assert.equal(f.form.attributes["aria-busy"], "false");
    f.open(); assert.equal(f.start.value, "2026-10-06"); f.picker.dispose();
});

test("Blazor callback failure retains committed range and allows retry without leaking exception text", async () => {
    let fail = true;
    const f = fixture(undefined, false, { blazor: true, async onApply() { if (fail) throw new Error("server-private-details"); return true; } });
    f.picker.setValue(null);
    f.open(); f.choose("today"); f.confirm();
    await new Promise(setImmediate);
    assert.equal(f.dialog.open, true);
    assert.equal(f.trigger.dataset.filtered, "false");
    assert.equal(f.error.hidden, false);
    assert.doesNotMatch(f.error.textContent, /server-private-details/);
    assert.ok(f.controls.every(control => !control.disabled));
    f.cancel(); f.open(); assert.equal(f.start.value, "");
    fail = false;
    f.choose("yesterday"); f.confirm();
    await new Promise(setImmediate);
    assert.equal(f.dialog.open, false);
    f.open(); assert.equal(f.start.value, "2026-10-05"); f.picker.dispose();
});

test("Blazor callback can reject the range without committing", async () => {
    const f = fixture(undefined, false, { blazor: true, onApply: async () => false });
    f.picker.setValue(null);
    f.open(); f.choose("today"); f.confirm();
    await new Promise(setImmediate);
    assert.equal(f.dialog.open, true);
    assert.equal(f.trigger.dataset.filtered, "false");
    assert.equal(f.error.hidden, false);
    f.picker.dispose();
});

test("disposing a pending Blazor picker restores controls and ignores the late result", async () => {
    let finish;
    const f = fixture(undefined, false, { blazor: true, onApply: () => new Promise(resolve => { finish = resolve; }) });
    f.picker.setValue(null);
    f.open(); f.choose("today"); f.confirm(); f.picker.dispose();
    assert.ok(f.controls.every(control => !control.disabled));
    finish(true);
    await new Promise(setImmediate);
    assert.equal(f.dialog.open, false);
    assert.equal(f.trigger.dataset.filtered, "false");
    f.open(); assert.equal(f.dialog.open, false);
});

test("remounting with a new date mode does not reuse old listeners or another instance's state", async () => {
    const first = fixture(undefined, false, { blazor: true, onApply: async () => true });
    const second = fixture(undefined, true);
    second.picker.dispose();
    const applied = [];
    const mounted = first.window.DateTimeRangePicker.mountBlazor(second.root, { invokeMethodAsync(method, range) { applied.push(range); return Promise.resolve(true); } });
    first.picker.setValue(null);
    mounted.setValue({ startTime: "2026-10-01T00:00:00+00:00", endTime: "2026-10-01T23:59:59.999+00:00", label: "自定义" });
    first.open(); first.choose("today"); first.confirm();
    await new Promise(setImmediate);
    assert.equal(applied.length, 0);
    second.open(); second.choose("yesterday"); second.confirm();
    await new Promise(setImmediate);
    assert.equal(applied.length, 1);
    assert.equal(second.applied.length, 0);
    assert.match(second.trigger.title, /\d{2}:\d{2}/);
    assert.doesNotMatch(first.trigger.title, /\d{2}:\d{2}/);
    first.picker.dispose(); mounted.dispose();
});

test("Enter in a date field confirms without reaching the parent form", () => {
    const f = fixture(undefined, false);
    f.open(); f.choose("today");
    const event = new Event("keydown", { cancelable: true, bubbles: true });
    Object.defineProperties(event, { key: { value: "Enter" }, target: { value: f.end } });
    let stopped = false;
    event.stopPropagation = () => { stopped = true; };
    f.form.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(stopped, true);
    assert.equal(f.applied.length, 1);
    f.picker.dispose();
});
