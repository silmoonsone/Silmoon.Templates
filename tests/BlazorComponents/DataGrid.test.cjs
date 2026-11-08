const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { promisify } = require("node:util");

const chromium = [
    process.env.CHROME_PATH,
    path.join(process.env.ProgramFiles || "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft/Edge/Application/msedge.exe"),
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(executable => executable && fs.existsSync(executable));

async function checkGrid() {
    const { mountBlazor, mount } = await import("./DataGrid.razor.js");
    function equal(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error(message + ": expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
    }
    function createRow(item) {
        const row = document.createElement("tr");
        row.dataset.gridKey = item.id;
        row.insertCell().textContent = item.name;
        row.insertCell().innerHTML = "<details><summary>Actions</summary></details>";
        return row;
    }
    const items = [{ id: "b", name: "Beta" }, { id: "a", name: "Alpha" }];
    const root = document.querySelector("[data-grid]");
    const body = root.querySelector("tbody");
    const [beta, alpha] = items.map(createRow);
    beta.dataset.gridIndex = "0";
    alpha.dataset.gridIndex = "1";
    body.append(beta, alpha);
    const calls = [];
    const blazor = mountBlazor(root, { async invokeMethodAsync(...args) { calls.push(args); } });
    root.querySelector("[data-grid-sort]").click();
    equal(calls.at(-1), ["ApplyGridOrder", ["a", "b"]], "Sorting requests a Blazor render");
    equal(body.rows[0] === beta, true, "Blazor owns the DOM until the render arrives");
    beta.cells[0].click();
    equal(calls.at(-1), ["NotifyGridRow", false, "b", "name", 0, 0], "Click coordinates describe the rows on screen during a pending render");
    beta.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    equal(document.activeElement === alpha, true, "ArrowDown follows the order currently on screen");
    body.append(alpha, beta);
    blazor.refreshRows();
    beta.cells[0].click();
    equal(calls.at(-1), ["NotifyGridRow", false, "b", "name", 1, 0], "Click coordinates follow the new rendered order");
    const count = calls.length;
    alpha.querySelector("summary").click();
    equal(calls.length, count, "Opening a nested disclosure must not activate or select its row");
    equal(alpha.querySelector("details").open, true, "Nested disclosure retains its native action");
    blazor.dispose();

    body.replaceChildren();
    const clicks = [];
    const grid = mount(root, { createRow, onRowClick(detail) { clicks.push(detail); } });
    grid.setItems(items);
    root.querySelector("[data-grid-sort]").click();
    equal(Array.from(body.rows, row => row.dataset.gridKey), ["a", "b"], "JS-owned rows reorder immediately");
    grid.setFilter("bet");
    body.rows[1].cells[0].click();
    equal(clicks.length, 1, "A disposed Blazor instance must not handle JS-owned clicks");
    equal(clicks[0].item === items[0], true, "The callback returns the original JS record");
    equal([clicks[0].key, clicks[0].column, clicks[0].rowIndex, clicks[0].columnIndex], ["b", "name", 0, 0], "A filtered row reports visible coordinates");
    equal(calls.length, count, "Changing row ownership detaches the old receiver");
    grid.setFilter("");
    grid.setDisabled(true);
    grid.select("a");
    equal(Array.from(body.rows, row => row.tabIndex), [-1, -1], "Programmatic selection must keep disabled rows out of the tab order");
    grid.setDisabled(false);
    equal(Array.from(body.rows).filter(row => row.tabIndex === 0).length, 1, "Enabling restores one keyboard entry point");

    grid.setFilter("alp");
    body.querySelector('[data-grid-key="a"] summary').focus();
    const replacement = { id: "a", name: "Alpha 2" };
    grid.setItems([{ id: "z", name: "Zulu" }, replacement]);
    equal(grid.selectedKey, "a", "Replacing records preserves selection by key");
    equal(grid.visibleItems, [replacement], "Filtering and sorting apply to the new records");
    equal(document.activeElement === body.querySelector('[data-grid-key="a"] summary'), true, "Focus follows the same action in a replaced row");
    body.rows[0].cells[0].click();
    equal(clicks.at(-1).item === replacement, true, "A click returns the replacement record");
    grid.setItems([{ id: "z", name: "Zulu" }]);
    equal(grid.selectedKey, null, "Removing a selected record clears selection");
    equal(root.querySelector("[data-grid-empty-filter]").hidden, false, "The empty state appears when refreshed data no longer matches");
    grid.setFilter("");
    equal(body.rows[0].tabIndex, 0, "Clearing the filter restores a keyboard entry point");
    grid.dispose();
}

test("DataGrid uses rendered row coordinates, preserves nested controls and supports JS-owned rows", {
    skip: chromium ? false : "Set CHROME_PATH to a Chromium executable to run the browser contract."
}, async t => {
    const { componentsRoot } = require("./component-assets.cjs");
    const module = fs.readFileSync(path.join(componentsRoot, "DataGrid.razor.js"));
    const html = `<!doctype html><meta charset="utf-8">
        <section data-grid data-single-select="true" data-grid-selection-callback="true">
            <input data-grid-filter><div data-grid-scroll><table>
                <thead><tr><th data-grid-column="name"><button data-grid-sort="name">Sort</button></th><th>Actions</th></tr></thead>
                <tbody data-grid-body></tbody>
            </table><div data-grid-empty-filter hidden>No matches</div></div>
        </section><output></output><script type="module">
            try { await (${checkGrid})(); document.querySelector("output").textContent = "PASS"; }
            catch (error) { document.querySelector("output").textContent = error.stack; }
        </script>`;
    const server = http.createServer((request, response) => {
        const isScript = request.url === "/DataGrid.razor.js";
        response.setHeader("Content-Type", isScript ? "text/javascript" : "text/html; charset=utf-8");
        response.end(isScript ? module : html);
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(() => server.close());
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "silmoon-grid-chromium-"));
    t.after(() => fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }));
    const { stdout } = await promisify(execFile)(chromium, [
        "--headless", "--disable-gpu", "--disable-background-networking", "--disable-dev-shm-usage",
        "--no-first-run", "--user-data-dir=" + profile, "--dump-dom", "--virtual-time-budget=5000",
        "http://127.0.0.1:" + server.address().port
    ], { windowsHide: true, timeout: 30000 });
    const result = stdout.match(/<output>([\s\S]*?)<\/output>/)?.[1];
    assert.equal(result, "PASS", result || "The browser did not report a result.");
});
