"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const vm = require("node:vm");

const repositoryRoot = path.resolve(__dirname, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8").replace(/^\uFEFF/, ""));
const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");

function inside(root, relative) {
    const file = path.resolve(root, relative);
    const fromRoot = path.relative(root, file);
    if (path.isAbsolute(fromRoot) || fromRoot === ".." || fromRoot.startsWith(".." + path.sep)) {
        throw new Error(`Path escapes its configured root: ${relative}`);
    }
    return file;
}

function realFile(root, relative) {
    const realRoot = fs.realpathSync(root);
    const file = fs.realpathSync(inside(realRoot, relative));
    inside(realRoot, path.relative(realRoot, file));
    if (!fs.statSync(file).isFile()) throw new Error(`Not a file: ${file}`);
    return file;
}

function sourceAssets() {
    const sourceRoot = inside(repositoryRoot, manifest.sourceRoot);
    return manifest.assets.map(relative => {
        const file = realFile(sourceRoot, relative);
        const data = fs.readFileSync(file);
        return { relative, file, data, sha256: sha256(data) };
    });
}

function planSync(projectNames = []) {
    for (const name of projectNames) {
        if (!manifest.projects.some(project => project.name === name)) throw new Error(`Unknown project: ${name}`);
    }
    const sources = sourceAssets();
    const projects = manifest.projects.filter(project => !projectNames.length || projectNames.includes(project.name));
    // Validate every target before writing, so missing repositories cannot cause a partial sync.
    return projects.flatMap(project => {
        const root = fs.realpathSync(path.resolve(repositoryRoot, project.repository));
        if (!fs.existsSync(path.join(root, ".git"))) throw new Error(`Not a repository: ${root}`);
        const webRoot = fs.realpathSync(inside(root, project.webRoot));
        inside(root, path.relative(root, webRoot));
        return sources.map(source => {
            const target = realFile(webRoot, source.relative);
            const currentHash = sha256(fs.readFileSync(target));
            return { project: project.name, source, target, currentHash, matches: currentHash === source.sha256 };
        });
    });
}

async function build() {
    // Checking and syncing require only Node; load optional development packages for builds.
    const CleanCSS = require("clean-css");
    const { minify } = require("terser");
    const results = [];
    for (const asset of sourceAssets()) {
        const source = asset.data.toString("utf8").replace(/^\uFEFF/, "");
        let code;
        if (asset.relative.endsWith(".css")) {
            const result = new CleanCSS({ level: 1, inline: false, rebase: false }).minify(source);
            if (result.errors.length || result.warnings.length) throw new Error([...result.errors, ...result.warnings].join("\n"));
            code = result.styles;
        } else {
            const result = await minify(source, { ecma: 2020, compress: true, mangle: true, format: { comments: /^!/ } });
            code = result.code;
            new vm.Script(code, { filename: asset.relative });
        }
        const data = Buffer.from(code + "\n");
        const gzip = zlib.gzipSync(data, { level: 9 });
        const brotli = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
        if (!zlib.gunzipSync(gzip).equals(data) || !zlib.brotliDecompressSync(brotli).equals(data)) throw new Error(`Compression round-trip failed: ${asset.relative}`);
        results.push({ asset, data, gzip, brotli });
    }
    const output = path.join(__dirname, "dist");
    fs.mkdirSync(output, { recursive: true });
    const realOutput = fs.realpathSync(output);
    inside(fs.realpathSync(__dirname), path.relative(fs.realpathSync(__dirname), realOutput));
    function writeOutput(relative, content) {
        const file = inside(realOutput, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        inside(realOutput, path.relative(realOutput, fs.realpathSync(path.dirname(file))));
        if (fs.existsSync(file)) inside(realOutput, path.relative(realOutput, fs.realpathSync(file)));
        fs.writeFileSync(file, content);
    }
    for (const { asset, data, gzip, brotli } of results) {
        writeOutput(asset.relative, data);
        writeOutput(asset.relative + ".gz", gzip);
        writeOutput(asset.relative + ".br", brotli);
    }
    const report = results.map(({ asset, data, gzip, brotli }) => ({
        file: asset.relative, sourceSha256: asset.sha256, sha256: sha256(data),
        sourceBytes: asset.data.length, minifiedBytes: data.length, gzipBytes: gzip.length, brotliBytes: brotli.length
    }));
    writeOutput("asset-manifest.json", JSON.stringify(report, null, 2) + "\n");
    console.table(report.map(({ file, sourceBytes, minifiedBytes, gzipBytes, brotliBytes }) => ({ file, sourceBytes, minifiedBytes, gzipBytes, brotliBytes })));
    return report;
}

async function main(args) {
    const modes = new Set(args.filter(arg => ["--check", "--write", "--build"].includes(arg)));
    if (modes.size > 1) throw new Error("--check, --write and --build are mutually exclusive.");
    const names = [];
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (modes.has(arg)) continue;
        if (arg === "--project" && args[index + 1] && !args[index + 1].startsWith("--")) names.push(args[++index]);
        else throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
    if (modes.has("--build")) {
        if (names.length) throw new Error("--project applies only to checking or syncing.");
        return build();
    }
    const write = modes.has("--write");
    const plan = planSync(names);
    let changed = 0;
    for (const entry of plan) {
        if (!entry.matches) {
            changed++;
            if (write) {
                fs.writeFileSync(entry.target, entry.source.data);
                if (sha256(fs.readFileSync(entry.target)) !== entry.source.sha256) throw new Error(`Verification failed: ${entry.target}`);
            }
        }
        console.log(`${entry.matches ? "OK" : write ? "UPDATED" : "DIFF"} ${entry.project}: ${entry.source.relative}`);
    }
    console.log(`${new Set(plan.map(entry => entry.project)).size} projects, ${plan.length} assets, ${changed} ${write ? "updated" : "different"}.`);
    if (!write && changed) process.exitCode = 1;
}

if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { repositoryRoot, manifest, inside, sha256, sourceAssets, planSync, build };
