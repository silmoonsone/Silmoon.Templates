const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const webRoot = path.join(__dirname, "../../Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/wwwroot");
const assets = new Map([
    ["/css/modern-color-layout.css", "text/css"],
    ["/js/modern-color-layout.js", "text/javascript"],
    ["/js/modern-color-layout-blazor.js", "text/javascript"],
    ["/lib/bootstrap/css/bootstrap.min.css", "text/css"],
    ["/lib/bootstrap-icons/font/bootstrap-icons.css", "text/css"],
    ["/lib/bootstrap-icons/font/fonts/bootstrap-icons.woff2", "font/woff2"]
]);
const pages = new Map([
    ["/backend/settings", "常规设置"],
    ["/backend/permissions", "权限设置"],
    ["/backend/export", "配置导出"],
    ["/backend/overview", "概览"]
]);

function render(currentPath) {
    function link(url) {
        const active = url === currentPath;
        return `<a href="${url}" class="menu-item${active ? " active" : ""}"${active ? ' aria-current="page"' : ""}>${pages.get(url)}</a>`;
    }
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>离线菜单回归</title><link rel="stylesheet" href="/lib/bootstrap/css/bootstrap.min.css"><link rel="stylesheet" href="/lib/bootstrap-icons/font/bootstrap-icons.css"><link rel="stylesheet" href="/css/modern-color-layout.css"></head>
<body><div id="content"><button id="toggle-menu" type="button" class="btn btn-primary" aria-label="打开菜单">菜单</button>
<div class="content-wrapper"><nav id="menu" aria-label="管理主菜单"><div class="menu-header"><h3>管理后台</h3></div>
${link("/backend/overview")}
<button class="menu-item menu-submenu-toggle" type="button" aria-controls="admin-system-submenu"><span>系统设置</span><i class="bi bi-chevron-down menu-submenu-arrow"></i></button>
<div id="admin-system-submenu" class="menu-submenu">${link("/backend/settings")}${link("/backend/permissions")}</div>
<button class="menu-item menu-submenu-toggle" type="button" aria-controls="admin-maintenance-submenu"><span>系统维护</span><i class="bi bi-chevron-down menu-submenu-arrow"></i></button>
<div id="admin-maintenance-submenu" class="menu-submenu">${link("/backend/export")}</div>
<hr><div class="theme-menu-buttons"><button class="theme-menu-btn" data-theme="light" type="button" title="亮色模式">亮</button><button class="theme-menu-btn" data-theme="dark" type="button" title="暗色模式">暗</button><button class="theme-menu-btn" data-theme="auto" type="button" title="自动模式">自动</button></div></nav>
<main class="content-main"><h1>${pages.get(currentPath)}</h1><p>加载模板实际菜单脚本和样式，模拟导航后的 DOM 替换；此预览不运行 ASP.NET 或连接数据库。</p><button id="repeat-refresh" class="btn" type="button">重复初始化</button></main></div></div>
<script src="/js/modern-color-layout.js"></script>
<script>window.Blazor = { addEventListener: (type, callback) => document.addEventListener(type, callback) };</script>
<script src="/js/modern-color-layout-blazor.js"></script>
<script>
window.ModernColorLayoutBlazor.init();
document.addEventListener("click", async event => {
    if (event.target.closest("#repeat-refresh")) { window.ModernColorLayoutBlazor.init(); return; }
    const link = event.target.closest("#menu a");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const html = await (await fetch(link.href)).text();
    const next = new DOMParser().parseFromString(html, "text/html");
    history.pushState(null, "", link.href);
    const oldContent = document.querySelector("#content");
    const oldMenu = document.querySelector("#menu");
    if (oldMenu && !oldContent.contains(oldMenu)) oldMenu.remove();
    oldContent.replaceWith(next.querySelector("#content"));
    document.dispatchEvent(new Event("enhancedload"));
});
window.addEventListener("popstate", () => location.reload());
</script></body></html>`;
}

const server = http.createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const type = assets.get(pathname);
    if (!pages.has(pathname) && !type) { response.writeHead(404); response.end(); return; }
    const content = type ? fs.readFileSync(path.join(webRoot, pathname)) : render(pathname);
    response.writeHead(200, { "Content-Type": type || "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : content);
});
server.listen(0, "127.0.0.1", () => console.log(`Offline menu: http://127.0.0.1:${server.address().port}/backend/settings`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
