const fs = require("node:fs");
const path = require("node:path");

function restoredAssetsRoot() {
    const project = "Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate";
    const manifest = path.resolve(__dirname, "../..", project, "obj/project.assets.json");
    if (!fs.existsSync(manifest)) throw new Error("Restore the template before running the component tests: dotnet restore " + project);
    const { libraries, packageFolders } = JSON.parse(fs.readFileSync(manifest, "utf8"));
    const id = Object.keys(libraries).find(name => name.startsWith("Silmoon.AspNetCore.Blazor/"));
    if (id && libraries[id].type === "package") {
        for (const folder of Object.keys(packageFolders)) {
            const assets = path.join(folder, libraries[id].path, "staticwebassets");
            if (fs.existsSync(assets)) return assets;
        }
    }
    throw new Error("Could not find the restored Silmoon.AspNetCore.Blazor package in " + manifest);
}

const componentsRoot = process.env.SILMOON_BLAZOR_COMPONENTS_ROOT || path.join(restoredAssetsRoot(), "Components");
const packageJs = path.resolve(componentsRoot, "../js");
// An explicit source checkout stores the same web assets under wwwroot.
const jsRoot = process.env.SILMOON_BLAZOR_COMPONENTS_ROOT && !fs.existsSync(packageJs)
    ? path.resolve(componentsRoot, "../wwwroot/js") : packageJs;
module.exports = { componentsRoot, jsRoot };
