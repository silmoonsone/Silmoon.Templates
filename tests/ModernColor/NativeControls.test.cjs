"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const chromium = [
    process.env.CHROME_PATH,
    path.join(process.env.ProgramFiles || "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft/Edge/Application/msedge.exe"),
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(executable => executable && fs.existsSync(executable));
const webRoot = path.resolve(__dirname, "../../Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/wwwroot");
const modernRoot = process.env.MODERN_COLOR_ASSET_ROOT || webRoot;

function contrast(first, second, backdrop = "rgb(255, 255, 255)") {
    function channels(color) { return color.match(/[\d.]+/g).map(Number); }
    function blend(foreground, background) {
        const opacity = foreground[3] ?? 1;
        return foreground.slice(0, 3).map((value, index) => value * opacity + background[index] * (1 - opacity));
    }
    function luminance(color) {
        const channels = color.map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    const background = blend(channels(second), channels(backdrop));
    const a = luminance(blend(channels(first), background)), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function connectDebugger(browser, profile) {
    const endpointFile = path.join(profile, "DevToolsActivePort");
    for (let attempt = 0; !fs.existsSync(endpointFile); attempt++) {
        if (browser.exitCode !== null || attempt === 100) throw new Error("Chromium did not expose a debugger endpoint.");
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    const [port, endpoint] = fs.readFileSync(endpointFile, "utf8").trim().split(/\r?\n/);
    const socket = new WebSocket("ws://127.0.0.1:" + port + endpoint);
    await once(socket, "open");
    let nextId = 0;
    const requests = new Map();
    const events = new Map();
    socket.addEventListener("message", ({ data }) => {
        const message = JSON.parse(data);
        const request = requests.get(message.id);
        if (request) {
            requests.delete(message.id);
            if (message.error) request.reject(new Error(JSON.stringify(message.error)));
            else request.resolve(message.result);
        }
        const waiter = events.get(message.method);
        if (waiter) { events.delete(message.method); waiter(message.params); }
    });
    return {
        send(method, params = {}, sessionId) {
            return new Promise((resolve, reject) => {
                const id = ++nextId;
                requests.set(id, { resolve, reject });
                socket.send(JSON.stringify({ id, method, params, sessionId }));
            });
        },
        waitFor(method) { return new Promise(resolve => events.set(method, resolve)); },
        close() { socket.close(); }
    };
}

test("native controls retain readable hover, focus, disabled and validation states", {
    skip: chromium ? false : "Set CHROME_PATH to a Chromium executable to run the browser contract.",
    timeout: 30000
}, async () => {
    const html = `<!doctype html><html data-theme="dark"><head><meta charset="utf-8">
        <link rel="stylesheet" href="/bootstrap.css"><link rel="stylesheet" href="/modern.css">
        <style>html { scroll-behavior: auto !important; }
        *, *::before, *::after, input::file-selector-button { transition: none !important; }
        main { max-width: 700px; margin: 24px; } .row { margin-bottom: 12px; } .valid-tooltip, .invalid-tooltip { position: static; display: block; }</style>
        </head><body><main>
        <div class="row"><input id="file" class="form-control" type="file"></div>
        <div class="row"><input id="disabledFile" class="form-control" type="file" disabled></div>
        <fieldset disabled><input id="fieldsetFile" class="form-control" type="file"></fieldset>
        <input id="invalid" class="form-control is-invalid" value="invalid">
        <select id="invalidSelect" class="form-select is-invalid"><option>Selected</option></select>
        <form class="was-validated"><input id="nativeInvalid" class="form-control" required value="">
            <select id="nativeInvalidSelect" class="form-select" required><option value="">Required</option></select></form>
        <input id="invalidCheck" class="form-check-input is-invalid" type="checkbox" checked>
        <input id="valid" class="form-control is-valid" value="valid">
        <select id="validSelect" class="form-select is-valid"><option>Selected</option></select>
        <input id="validCheck" class="form-check-input is-valid" type="checkbox" checked>
        <select id="multipleSelect" class="form-select is-invalid" multiple><option>Multiple</option></select>
        <select id="listSelect" class="form-select is-valid" size="3"><option>List</option></select>
        <input id="date" class="form-control" type="date" value="2026-11-13">
        <div class="form-switch"><input id="switch" class="form-check-input" type="checkbox"></div>
        <input id="indeterminate" class="form-check-input" type="checkbox">
        <input id="uncheckedCheck" class="form-check-input" type="checkbox">
        <input id="disabledCheck" class="form-check-input" type="checkbox" disabled>
        <input id="radioA" class="form-check-input" type="radio" name="unselectedRadioGroup">
        <input id="radioB" class="form-check-input" type="radio" name="unselectedRadioGroup">
        <input id="disabledRadio" class="form-check-input" type="radio" name="unselectedRadioGroup" disabled>
        <input id="plaintext" class="form-control-plaintext" value="Readable plain text" readonly>
        <div id="validTooltip" class="valid-tooltip">Valid value</div>
        <div id="invalidTooltip" class="invalid-tooltip">Invalid value</div>
        </main></body></html>`;
    const assets = new Map([
        ["/bootstrap.css", fs.readFileSync(path.join(webRoot, "lib/bootstrap/css/bootstrap.min.css"))],
        ["/modern.css", fs.readFileSync(path.join(modernRoot, "css/modern-color-layout.css"))]
    ]);
    const server = http.createServer((request, response) => {
        response.setHeader("Content-Type", assets.has(request.url) ? "text/css" : "text/html; charset=utf-8");
        response.end(assets.get(request.url) || html);
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "silmoon-native-controls-"));
    const browser = spawn(chromium, [
        "--headless", "--disable-gpu", "--no-first-run", "--disable-background-networking",
        "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"
    ], { windowsHide: true, stdio: "ignore" });
    const stopped = once(browser, "exit");
    let debuggerClient;
    try {
        debuggerClient = await connectDebugger(browser, profile);
        const { targetId } = await debuggerClient.send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await debuggerClient.send("Target.attachToTarget", { targetId, flatten: true });
        const send = (method, params) => debuggerClient.send(method, params, sessionId);
        async function evaluate(expression) {
            const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
            return result.result.value;
        }
        await send("Page.enable");
        const loaded = debuggerClient.waitFor("Page.loadEventFired");
        await send("Page.navigate", { url: "http://127.0.0.1:" + server.address().port });
        await loaded;
        await evaluate(`document.getElementById("indeterminate").indeterminate = true`);

        async function styles(id, pseudo = null) {
            return evaluate(`(() => {
                const element = document.getElementById(${JSON.stringify(id)});
                const style = getComputedStyle(element, ${JSON.stringify(pseudo)});
                const images = Array.from(style.backgroundImage.matchAll(/url\\("([^"]+)"\\)/g));
                let indicator = null;
                if (images[0]?.[1].startsWith("data:image/svg+xml,")) {
                    const svg = new DOMParser().parseFromString(decodeURIComponent(images[0][1].slice(19)), "image/svg+xml");
                    const mark = svg.querySelector("path, circle");
                    const color = document.createElement("span");
                    color.style.color = mark?.getAttribute("stroke") || mark?.getAttribute("fill");
                    indicator = color.style.color;
                }
                return { color: style.color, background: style.backgroundColor, border: style.borderTopColor,
                    shadow: style.boxShadow, scheme: style.colorScheme,
                    imageCount: images.length, indicator,
                    disabled: element.matches(":disabled"), focused: element === document.activeElement,
                    checked: element.checked, indeterminate: element.matches(":indeterminate") };
            })()`);
        }
        async function focus(id) {
            await evaluate(`document.getElementById(${JSON.stringify(id)}).focus({ preventScroll: true })`);
            const result = await styles(id);
            assert.equal(result.focused, true, id + " must actually have keyboard focus");
            return result;
        }
        async function hover(id) {
            const point = await evaluate(`(async () => {
                const element = document.getElementById(${JSON.stringify(id)});
                element.scrollIntoView({ block: "center", behavior: "instant" });
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const rect = element.getBoundingClientRect();
                return { x: rect.left + 12, y: rect.top + rect.height / 2 };
            })()`);
            await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
            const hovered = await evaluate(`new Promise(resolve => requestAnimationFrame(() =>
                resolve(document.getElementById(${JSON.stringify(id)}).matches(":hover"))))`);
            assert.equal(hovered, true, id + " must actually be hovered");
        }

        for (const theme of ["dark", "light"]) {
            await evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}; document.activeElement.blur()`);
            await hover("file");
            const file = await styles("file", "::file-selector-button");
            assert.ok(contrast(file.color, file.background) >= 4.5, theme + " file button text must remain readable on hover: " + JSON.stringify(file));
            await focus("file");
            const focusedFile = await styles("file", "::file-selector-button");
            assert.ok(contrast(focusedFile.color, focusedFile.background) >= 4.5, theme + " focused file button must remain readable");
            for (const id of ["disabledFile", "fieldsetFile"]) {
                await hover(id);
                const input = await styles(id), button = await styles(id, "::file-selector-button");
                assert.equal(input.disabled, true, id + " must be disabled by native semantics");
                assert.equal(button.color, input.color, theme + " " + id + " must show disabled text on its file button");
                assert.notEqual(button.background, file.background, theme + " " + id + " must not show the enabled hover background");
            }
            for (const id of ["invalid", "invalidSelect", "nativeInvalid", "nativeInvalidSelect", "invalidCheck", "valid", "validSelect", "validCheck"]) {
                await evaluate(`document.activeElement.blur()`);
                const before = await styles(id);
                const focused = await focus(id);
                assert.equal(focused.border, before.border, theme + " " + id + " must preserve its validation border on focus");
                const channels = focused.border.match(/[\d.]+/g).map(Number);
                const valid = id.startsWith("valid");
                const expectedChannel = valid ? 1 : 0;
                assert.ok(channels[expectedChannel] > channels[1 - expectedChannel] && channels[expectedChannel] > channels[2],
                    theme + " " + id + " must retain its semantic validation color");
            }
            await evaluate(`document.activeElement.blur()`);
            const mixed = await styles("indeterminate");
            const focusedMixed = await focus("indeterminate");
            assert.equal(focusedMixed.background, mixed.background, theme + " mixed checkbox must preserve its selected appearance on focus");
            // Radios also match :indeterminate until one group member is selected.
            await evaluate(`document.activeElement.blur();
                document.querySelectorAll("input[name=unselectedRadioGroup]").forEach(input => input.checked = false)`);
            const unchecked = await styles("uncheckedCheck");
            const disabledCheck = await styles("disabledCheck");
            for (const id of ["radioA", "radioB"]) {
                const radio = await styles(id);
                assert.equal(radio.checked, false, id + " must start unchecked");
                assert.equal(radio.indeterminate, true, id + " must exercise native radio indeterminate semantics");
                assert.equal(radio.background, unchecked.background, theme + " " + id + " must not look selected before the group has a value");
                assert.equal(radio.imageCount, 0, theme + " " + id + " must not show a selected dot");
                const focusedRadio = await focus(id);
                assert.equal(focusedRadio.checked, false, id + " must remain unchecked on focus");
                assert.equal(focusedRadio.background, unchecked.background, theme + " " + id + " must remain visually unchecked on focus");
            }
            const disabledRadio = await styles("disabledRadio");
            assert.equal(disabledRadio.disabled, true, "disabledRadio must be natively disabled");
            assert.equal(disabledRadio.checked, false, "disabledRadio must remain unchecked");
            assert.equal(disabledRadio.background, disabledCheck.background, theme + " disabled radio must keep the disabled unselected appearance");
            assert.equal(disabledRadio.imageCount, 0, theme + " disabled radio must not show a selected dot");
            await evaluate(`document.getElementById("radioB").click()`);
            const selectedRadio = await styles("radioB");
            assert.equal(selectedRadio.checked, true, "clicking a radio must select it");
            assert.equal(selectedRadio.indeterminate, false, "a selected radio group must no longer be indeterminate");
            assert.equal(selectedRadio.background, mixed.background, theme + " selected radio must use the selected fill");
            assert.equal(selectedRadio.imageCount, 1, theme + " selected radio must show its dot");
            const remainingRadio = await styles("radioA");
            assert.equal(remainingRadio.checked, false, "the other radio must remain unchecked");
            assert.equal(remainingRadio.indeterminate, false, "other radios in a selected group must no longer be indeterminate");
            assert.equal(remainingRadio.background, unchecked.background, theme + " other radio must keep its unchecked appearance");
            const bodyColor = await evaluate(`getComputedStyle(document.body).backgroundColor`);
            assert.ok(contrast((await styles("plaintext")).color, bodyColor) >= 4.5, theme + " plain text input must remain readable");
            for (const id of ["validTooltip", "invalidTooltip"]) {
                const tip = await styles(id);
                assert.ok(contrast(tip.color, tip.background, bodyColor) >= 4.5, theme + " " + id + " must have readable text: " + JSON.stringify(tip));
            }
            for (const id of ["invalidSelect", "validSelect", "nativeInvalidSelect"]) {
                const select = await styles(id);
                assert.equal(select.imageCount, 2, theme + " " + id + " must show both the arrow and validation icon");
                assert.ok(select.indicator && contrast(select.indicator, select.background, bodyColor) >= 3,
                    theme + " " + id + " must have a visible arrow");
            }
            for (const id of ["multipleSelect", "listSelect"]) {
                assert.equal((await styles(id)).imageCount, 0, theme + " " + id + " must not show a dropdown arrow");
            }
            // Chromium returns the host's styles for its internal date/range pseudo-elements;
            // their actual icons and tracks need the separate visual regression check.
            const date = await styles("date");
            assert.equal(date.scheme, theme, "Native date controls must receive the current color scheme");
            const offSwitch = await styles("switch");
            assert.ok(offSwitch.indicator && contrast(offSwitch.indicator, offSwitch.background, bodyColor) >= 3,
                theme + " unchecked switch must have a visible thumb");
        }
    } finally {
        if (debuggerClient) {
            await debuggerClient.send("Browser.close").catch(() => {});
            debuggerClient.close();
        } else {
            browser.kill();
        }
        await stopped;
        await new Promise(resolve => server.close(resolve));
        assert.equal(path.dirname(profile), os.tmpdir(), "Only the test-created browser profile may be removed.");
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    }
});
