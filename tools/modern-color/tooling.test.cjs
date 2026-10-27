"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const { inside, planSync, sourceAssets, sha256, build } = require("./manage.cjs");

test("sync rejects unknown targets and paths outside a configured root before writing", () => {
    assert.throws(() => planSync(["unknown-repository"]), /Unknown project/);
    assert.throws(() => inside(__dirname, "../outside.js"), /escapes/);
    const sourcesBefore = sourceAssets().map(asset => asset.sha256);
    const result = spawnSync(process.execPath, [path.join(__dirname, "manage.cjs"), "--write", "--project", "unknown-repository"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    const conflicting = spawnSync(process.execPath, [path.join(__dirname, "manage.cjs"), "--check", "--write"], { encoding: "utf8" });
    assert.equal(conflicting.status, 1);
    assert.match(conflicting.stderr, /mutually exclusive/);
    assert.deepEqual(sourceAssets().map(asset => asset.sha256), sourcesBefore);
    assert.ok(planSync(["Silmoon.Templates"]).every(entry => entry.matches));
});

test("release assets keep public paths, round-trip compression and leave readable source untouched", async () => {
    const before = sourceAssets();
    const report = await build();
    assert.deepEqual(sourceAssets().map(asset => asset.sha256), before.map(asset => asset.sha256));
    assert.deepEqual(report.map(asset => asset.file), before.map(asset => asset.relative));
    for (const asset of report) {
        const file = path.join(__dirname, "dist", asset.file);
        const data = fs.readFileSync(file);
        assert.equal(sha256(data), asset.sha256);
        assert.deepEqual(zlib.gunzipSync(fs.readFileSync(file + ".gz")), data);
        assert.deepEqual(zlib.brotliDecompressSync(fs.readFileSync(file + ".br")), data);
        assert.ok(asset.minifiedBytes < asset.sourceBytes);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "dist/asset-manifest.json"), "utf8"));
    assert.deepEqual(manifest, report);
});
