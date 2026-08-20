# 现代颜色布局静态使用说明（Agent）

本文给 Codex 或其他 AI Agent 使用，说明如何在静态 HTML、Razor Pages 或 MVC 视图中使用现代颜色布局框架。

`HtmlColorScheme` 不是 ASP.NET 项目，它的 `.markdown` 目录只保留这份静态说明。`Silmoon.AspNetCore.Id` 和 `Silmoon.AspNetCore.FullFunctionTemplate` 是 ASP.NET 项目，它们除静态说明外还应保留 Blazor 说明。

## 1. 目标和边界

现代颜色布局框架的核心只包含：

- `modern-color-layout.css`：颜色变量、布局、菜单、控件状态和响应式样式。
- `modern-color-layout.js`：主题切换、移动端菜单、菜单激活、子菜单交互。

共享 CSS 和 JS 必须保持三处一致：

- `D:\Git\GitHub\silmoonsone\HtmlColorScheme\css\modern-color-layout.css`
- `D:\Git\GitHub\silmoonsone\HtmlColorScheme\js\modern-color-layout.js`
- `D:\Git\GitHub\silmoonsone\Silmoon.AspNetCore.Id\Silmoon.AspNetCore.Id\wwwroot\css\modern-color-layout.css`
- `D:\Git\GitHub\silmoonsone\Silmoon.AspNetCore.Id\Silmoon.AspNetCore.Id\wwwroot\js\modern-color-layout.js`
- `D:\Git\GitHub\silmoonsone\Silmoon.Templates\Silmoon.Templates\content\Silmoon.AspNetCore.FullFunctionTemplate\wwwroot\css\modern-color-layout.css`
- `D:\Git\GitHub\silmoonsone\Silmoon.Templates\Silmoon.Templates\content\Silmoon.AspNetCore.FullFunctionTemplate\wwwroot\js\modern-color-layout.js`

修改共享行为时，优先在 `HtmlColorScheme` 中调整和验证，再同步到两个 ASP.NET 项目。项目私有行为不能写入共享 CSS/JS。

## 2. 依赖

静态页面需要 Bootstrap 5 和 Bootstrap Icons。`modern-color-layout.js` 只使用标准浏览器 API。

```html
<link href="bootstrap.min.css" rel="stylesheet">
<link href="bootstrap-icons.css" rel="stylesheet">
<link href="css/modern-color-layout.css" rel="stylesheet">
<script src="bootstrap.bundle.min.js"></script>
<script src="js/modern-color-layout.js"></script>
```

Bootstrap JS 只负责 Bootstrap 自己的 tabs、dropdown、modal 等组件。现代颜色布局的主题、菜单和子菜单行为由 `modern-color-layout.js` 负责。

## 3. 必需布局外壳

静态页必须保留这些结构和类名：

```html
<div id="content">
    <div class="theme-toggle-group">
        <button class="theme-btn" data-theme="light" title="亮色模式" type="button"><i class="bi bi-sun"></i></button>
        <button class="theme-btn" data-theme="dark" title="暗色模式" type="button"><i class="bi bi-moon"></i></button>
        <button class="theme-btn" data-theme="auto" title="自动模式" type="button"><i class="bi bi-circle-half"></i></button>
    </div>
    <button id="toggle-menu" class="btn btn-primary" type="button" aria-label="打开菜单"><i class="bi bi-list"></i></button>
    <div class="content-wrapper">
        <nav id="menu" aria-label="主菜单">
            <div class="menu-header">
                <h3>实例页面</h3>
                <div class="text-secondary">现代色彩功能布局</div>
            </div>
            <a href="#overview" class="menu-item active"><i class="bi bi-house-door"></i>布局概览</a>
        </nav>
        <main class="content-main">
            <!-- 页面内容 -->
        </main>
    </div>
</div>
```

除非同时修改共享 CSS 和 JS，否则不要重命名 `#content`、`.theme-toggle-group`、`#toggle-menu`、`.content-wrapper`、`#menu`、`.menu-item`、`.content-main`。

当前项目里的静态入口分别是：

- `HtmlColorScheme`：`index.html`。
- `Silmoon.AspNetCore.Id`：`Pages\Shared\_ModernColorLayout.cshtml`、`Pages\Shared\_ModernAccountLayout.cshtml`。
- `Silmoon.AspNetCore.FullFunctionTemplate`：`Pages\Shared\_ModernColorLayout.cshtml`、`Pages\Shared\_ModernColorLayoutDemo.cshtml`、`Pages\ModernColorDemo.cshtml`。

## 4. 菜单激活规则

锚点页面使用 hash 链接：

```html
<a href="#forms" class="menu-item"><i class="bi bi-input-cursor"></i>表单控件</a>
```

脚本会在点击菜单项时激活对应链接，也会在打开 `index.html#forms` 或 `SomePage#forms` 时激活匹配项。

普通页面导航由服务端或页面模板输出当前项：

```html
<a href="/users" class="menu-item active"><i class="bi bi-people"></i>用户管理</a>
```

也可以使用 `aria-current="page"` 标记当前项。共享 JS 会把它当作激活状态。

## 5. 子菜单规则

子菜单必须使用统一结构：

```html
<div class="menu-group">
    <button class="menu-item menu-submenu-toggle" type="button">
        <span><i class="bi bi-folder"></i>系统管理</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div class="menu-submenu">
        <a href="/users" class="menu-item"><i class="bi bi-people"></i>用户管理</a>
        <a href="/roles" class="menu-item"><i class="bi bi-shield"></i>角色管理</a>
    </div>
</div>
```

激活子菜单时，只标记子项 `active` 或 `aria-current="page"`，不要把父级按钮标记为当前页。共享 JS 会处理 `aria-controls`、`aria-expanded`、`.menu-submenu.open`、`.child-active` 和父级自动展开。

不要再写第二套子菜单脚本。

## 6. 主题规则

主题按钮使用：

- `data-theme="light"`：亮色。
- `data-theme="dark"`：暗色。
- `data-theme="auto"`：跟随系统。

当前选择保存在 `localStorage` 的 `modern-color-layout-theme`。桌面浮动按钮使用 `.theme-btn`，菜单内按钮使用 `.theme-menu-btn`，脚本会自动同步两组按钮状态。

## 7. 移动端规则

移动端打开菜单时，脚本会把 `#menu` 移动到 `document.body`，让菜单在页面滚动后仍固定显示在 `#toggle-menu` 下方。回到桌面布局时，脚本会把菜单移回 `.content-wrapper`。

不要写依赖 `#menu.parentElement` 永远等于 `.content-wrapper` 的代码。

移动端菜单和按钮的间距由变量控制：

```css
:root {
    --mobile-menu-gap: 10px;
}
```

## 8. 项目私有规则

共享 CSS/JS 只能放框架通用行为。以下内容属于项目私有行为：

- 登录、注册、退出登录。
- 账号系统专属视觉样式，例如 Id 项目的 `modern-color-layout-id.css`。
- 项目接口调用、业务状态、权限判断。
- 只在某个项目中存在的菜单项和文案。

项目私有行为应放在项目自己的布局、组件、`site.js` 或私有 CSS 文件中。

## 9. 回归检查

修改完成前至少检查：

- 三处 `modern-color-layout.css` hash 一致。
- 三处 `modern-color-layout.js` hash 一致。
- `node --check js/modern-color-layout.js` 或对应项目下的 `wwwroot\js\modern-color-layout.js` 通过。
- 亮色、暗色、自动模式按钮状态同步。
- 菜单项点击后能正确激活。
- hash 导航能激活对应静态菜单项。
- 子菜单子项激活时父级自动展开。
- 移动端滚动后菜单仍显示在按钮下方。
- `button.menu-item` 不显示成浏览器原生白色按钮。
- 常用控件在亮色和暗色模式下都可读。
