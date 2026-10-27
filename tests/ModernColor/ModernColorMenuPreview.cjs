const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const webRoot = path.join(__dirname, "../../Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/wwwroot");
const modernRoot = process.env.MODERN_COLOR_ASSET_ROOT ? path.resolve(process.env.MODERN_COLOR_ASSET_ROOT) : webRoot;
const assets = new Map([
    ["/css/modern-color-layout.css", "text/css"],
    ["/js/modern-color-layout.js", "text/javascript"],
    ["/lib/bootstrap/css/bootstrap.min.css", "text/css"],
    ["/lib/bootstrap-icons/font/bootstrap-icons.css", "text/css"],
    ["/lib/bootstrap-icons/font/fonts/bootstrap-icons.woff2", "font/woff2"]
]);
const pages = new Map([
    ["/backend/settings", "常规设置"],
    ["/backend/permissions", "权限设置"],
    ["/backend/export", "配置导出"],
    ["/backend/overview", "概览"],
    ["/layout/empty", "空正文"],
    ["/layout/short", "短页面"],
    ["/layout/long", "长页面"],
    ["/layout/long-menu", "长菜单"],
    ["/layout/legacy", "旧版无页脚布局"],
    ["/layout/plain", "离开现代布局"]
]);

function render(currentPath) {
    function link(url) {
        const active = url === currentPath;
        return `<a href="${url}" class="menu-item${active ? " active" : ""}"${active ? ' aria-current="page"' : ""}>${pages.get(url)}</a>`;
    }
    const isEmpty = currentPath === "/layout/empty";
    const isLong = currentPath === "/layout/long";
    const isLegacy = currentPath === "/layout/legacy";
    const isPlain = currentPath === "/layout/plain";
    const longMenu = currentPath === "/layout/long-menu" ? `<button class="menu-item menu-submenu-toggle" type="button" aria-controls="long-submenu" aria-expanded="true">长菜单 30 项</button><div id="long-submenu" class="menu-submenu open">${Array.from({ length: 30 }, (_, index) => `<a href="#long-item-${index + 1}" class="menu-item">第 ${index + 1} 项</a>`).join("")}</div>` : "";
    const menu = `<nav id="menu" aria-label="管理主菜单"><div class="menu-header"><h3>管理后台</h3></div>
${link("/backend/overview")}
<button class="menu-item menu-submenu-toggle" type="button" aria-controls="admin-system-submenu"><span>系统设置</span><i class="bi bi-chevron-down menu-submenu-arrow"></i></button>
<div id="admin-system-submenu" class="menu-submenu">${link("/backend/settings")}${link("/backend/permissions")}</div>
<button class="menu-item menu-submenu-toggle" type="button" aria-controls="admin-maintenance-submenu"><span>系统维护</span><i class="bi bi-chevron-down menu-submenu-arrow"></i></button>
<div id="admin-maintenance-submenu" class="menu-submenu">${link("/backend/export")}</div>
${longMenu}
<hr><div class="theme-menu-buttons"><button class="theme-menu-btn" data-theme="light" type="button" title="亮色模式">亮</button><button class="theme-menu-btn" data-theme="dark" type="button" title="暗色模式">暗</button><button class="theme-menu-btn" data-theme="auto" type="button" title="自动模式">自动</button></div></nav>`;
    const controls = `<div class="d-flex flex-wrap gap-2"><button id="repeat-refresh" class="btn" type="button">重复初始化</button><button id="dispose-refresh" class="btn" type="button">销毁再初始化</button><button id="replace-back-to-top" class="btn" type="button">替换返回顶部</button></div>`;
    const links = Array.from(pages, ([url, title]) => `<a href="${url}" data-preview-link>${title}</a>`).join(" · ");
    const content = isEmpty ? "" : `<h1>${pages.get(currentPath)}</h1><p>使用模板实际 CSS 和 JS。此离线页面仅替换内容片段，模拟 enhancedload，不连接数据库。</p>${controls}<p class="mt-3">${links}</p>${isLong ? '<section style="min-height:150vh"><h2>长正文</h2><p>滚到页底检查菜单顶部和全宽页脚。</p></section>' : ''}<div id="long-item-30">正文末项</div>`;
    const footer = `<footer class="modern-color-footer"><span>© 2026 布局回归 · 自定义版权</span><nav class="modern-color-footer-links" aria-label="页脚导航"><a href="/layout/empty" data-preview-link>空正文</a><a href="/layout/short" data-preview-link>短页面</a><a href="/layout/long" data-preview-link>长页面</a><a href="/layout/long-menu" data-preview-link>长菜单</a></nav></footer>`;
    const shell = isPlain ? `<div id="content"><main><h1>普通布局</h1><p>增强导航离开现代布局后，应清理其返回顶部按钮和运行时监听。</p><a href="/backend/overview" data-preview-link>返回现代布局</a></main></div>` : `<div id="content"><button id="toggle-menu" type="button" class="btn btn-primary" aria-label="打开菜单">菜单</button><div class="content-wrapper">${isLegacy ? menu : '<div class="modern-color-menu-region">' + menu + '</div>'}<main class="content-main">${content}</main>${isLegacy ? '' : footer}</div></div>`;
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pages.get(currentPath)} · 布局回归</title><link rel="stylesheet" href="/lib/bootstrap/css/bootstrap.min.css"><link rel="stylesheet" href="/lib/bootstrap-icons/font/bootstrap-icons.css"><link rel="stylesheet" href="/css/modern-color-layout.css"></head>
<body>${shell}
<script src="/js/modern-color-layout.js"></script>
<script>window.Blazor = { addEventListener: (type, callback) => document.addEventListener(type, callback) };</script>
<script>
window.ModernColorLayout.initBlazor();
document.addEventListener("click", async event => {
    if (event.target.closest("#repeat-refresh")) { window.ModernColorLayout.initBlazor(); return; }
    if (event.target.closest("#dispose-refresh")) { window.ModernColorLayout.dispose(); window.ModernColorLayout.initBlazor(); return; }
    if (event.target.closest("#replace-back-to-top")) { document.querySelector(".back-to-top")?.remove(); window.ModernColorLayout.initBlazor(); return; }
    const link = event.target.closest("#menu a, a[data-preview-link]");
    if (!link || link.getAttribute("href").startsWith("#") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const html = await (await fetch(link.href)).text();
    const next = new DOMParser().parseFromString(html, "text/html");
    history.pushState(null, "", link.href);
    document.title = next.title;
    document.querySelector("#content").replaceWith(next.querySelector("#content"));
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
    const assetRoot = pathname.includes("modern-color-layout") ? modernRoot : webRoot;
    const content = type ? fs.readFileSync(path.join(assetRoot, pathname)) : render(pathname);
    response.writeHead(200, { "Content-Type": type || "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : content);
});
server.listen(0, "127.0.0.1", () => {
    console.log(`Offline menu: http://127.0.0.1:${server.address().port}/backend/settings`);
    console.log(`Modern assets: ${modernRoot}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
