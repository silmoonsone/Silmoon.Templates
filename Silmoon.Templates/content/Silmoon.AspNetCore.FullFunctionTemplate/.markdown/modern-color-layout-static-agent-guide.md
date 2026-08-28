# 现代颜色布局 cshtml 使用说明（Agent）

本文给 Codex 或其他 AI Agent 使用，说明如何在当前项目的 Razor Pages cshtml 页面中使用现代颜色布局。

本说明只针对当前项目的 cshtml/Razor Pages 结构，不说明 Blazor 用法。Blazor 页面请阅读同目录的 `modern-color-layout-blazor-agent-guide.md`。

## 1. 项目定位

当前项目内置一套现代颜色布局，可用于 Razor Pages 或 MVC View 的后台页面、管理页面、功能演示页面。

这套 cshtml 布局的目标：

- 提供统一的现代颜色变量、菜单、主题切换和控件状态。
- 让项目可以直接复用后台页面外壳。
- 提供 `Pages/ModernColorDemo.cshtml` 作为控件和状态回归样板。
- 允许业务项目在保留结构的基础上替换菜单、文案和认证行为。

## 2. 相关文件

cshtml 现代颜色布局相关文件：

- `Pages/Shared/_ModernColorLayout.cshtml`：现代颜色布局外壳，负责引用 CSS/JS、主题按钮、移动端菜单按钮和 `.content-wrapper`。
- `Pages/Shared/_ModernColorLayoutDemo.cshtml`：演示用二级布局，负责输出 `nav#menu`、菜单项、子菜单、退出登录入口、菜单内主题按钮和 `.content-main`。
- `Pages/ModernColorDemo.cshtml`：演示页面，覆盖表单、按钮、标签页、表格、提示框、菜单、子菜单和多种控件状态。
- `wwwroot/css/modern-color-layout.css`：现代颜色布局核心样式。
- `wwwroot/js/modern-color-layout.js`：现代颜色布局核心脚本，公开可重复调用的 `ModernColorLayout.refresh()`。
- `Pages/Shared/_BlankLayout.cshtml`：底层空白布局，提供 HTML head、Bootstrap、Bootstrap Icons 和基础脚本。

项目私有样式和脚本应放在当前项目自己的 CSS/JS 文件中，不要混入 `modern-color-layout.css` 或 `modern-color-layout.js`。

## 3. 布局关系

`_ModernColorLayout.cshtml` 使用 `_BlankLayout`：

```cshtml
@{
    Layout = "_BlankLayout";
}
<link rel="stylesheet" href="~/css/modern-color-layout.css" asp-append-version="true" />
<script src="~/js/modern-color-layout.js" asp-append-version="true"></script>
```

它提供基础外壳：

- `#content`
- `.theme-toggle-group`
- `#toggle-menu`
- `.content-wrapper`

`_ModernColorLayoutDemo.cshtml` 再使用 `_ModernColorLayout`：

```cshtml
@{
    Layout = "_ModernColorLayout";
}
```

它提供：

- `nav#menu`
- `.menu-header`
- `.menu-item`
- `.menu-group`
- `.menu-submenu`
- `.theme-menu-buttons`
- `.content-main`

页面最终可以这样使用：

```cshtml
@page
@{
    Layout = "_ModernColorLayoutDemo";
}

<header id="overview" class="content-header">
    <h1>页面标题</h1>
    <p class="text-secondary mt-2">页面说明</p>
</header>
```

## 4. 自定义业务布局

`_ModernColorLayoutDemo.cshtml` 是示例布局，不要求业务项目原样保留。实际项目可以复制它并新建自己的后台布局，例如：

- `Pages/Shared/_AdminModernLayout.cshtml`
- `Pages/Shared/_AccountModernLayout.cshtml`
- `Pages/Shared/_DeveloperModernLayout.cshtml`

自定义布局时应保留：

- `nav id="menu"`
- `.menu-item`
- `.menu-group`
- `.menu-submenu-toggle`
- `.menu-submenu`
- `.content-main`
- `.theme-menu-btn`

可以替换：

- 菜单标题和副标题。
- 菜单项文案、图标和链接。
- 退出登录入口。
- 权限判断和显示条件。
- 页面主体内容。

不要改变 `#content`、`#toggle-menu`、`.content-wrapper` 的层级关系，除非同时确认 CSS 和 JS 仍然能处理桌面端与移动端菜单。

## 5. 菜单和激活状态

同页锚点菜单使用 hash：

```cshtml
<a href="#forms" class="menu-item">
    <i class="bi bi-input-cursor"></i>表单控件
</a>
```

普通页面菜单应由 cshtml 根据当前页面输出 `active` 或 `aria-current="page"`：

```cshtml
<a asp-page="/Users/Index" class="menu-item active" aria-current="page">
    <i class="bi bi-people"></i>用户管理
</a>
```

实际项目不要把所有菜单项都硬写为 `active`。应根据当前页面条件输出：

```cshtml
@{
    var isUsersPage = ViewContext.RouteData.Values["page"]?.ToString()?.StartsWith("/Users") == true;
}

<a asp-page="/Users/Index"
   class="menu-item @(isUsersPage ? "active" : null)"
   aria-current="@(isUsersPage ? "page" : null)">
    <i class="bi bi-people"></i>用户管理
</a>
```

如果菜单来自模型或权限服务，也应在服务端渲染时决定当前项。`modern-color-layout.js` 会识别 `.active` 和 `aria-current="page"`。

常见菜单模式：

1. 只有主菜单，没有子菜单。

```cshtml
<a asp-page="/Dashboard" class="menu-item active" aria-current="page">
    <i class="bi bi-speedometer2"></i>Dashboard
</a>
```

这种菜单项本身就是页面入口。当前页面必须由服务端输出 `active` 或 `aria-current="page"`。

2. 主菜单本身是页面入口，同时下面还有子菜单。

```cshtml
<div class="menu-group">
    <a asp-page="/Users/Index" class="menu-item active" aria-current="page">
        <i class="bi bi-people"></i>用户总览
    </a>
    <button class="menu-item menu-submenu-toggle" type="button">
        <span><i class="bi bi-list"></i>用户功能</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div class="menu-submenu">
        <a asp-page="/Users/Create" class="menu-item">创建用户</a>
        <a asp-page="/Users/Roles" class="menu-item">角色权限</a>
    </div>
</div>
```

这种场景下，主页面入口使用普通 `<a class="menu-item">`，展开按钮单独使用 `button.menu-submenu-toggle`。不要让同一个元素既负责导航又负责展开。

3. 父级只负责展开，没有自己的页面行为。

```cshtml
<div class="menu-group">
    <button class="menu-item menu-submenu-toggle" type="button">
        <span><i class="bi bi-folder"></i>系统管理</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div class="menu-submenu">
        <a asp-page="/Users/Index" class="menu-item active" aria-current="page">用户管理</a>
        <a asp-page="/Roles/Index" class="menu-item">角色管理</a>
    </div>
</div>
```

这种场景下，父级按钮永远不要输出 `active` 或 `aria-current="page"`。只标记真正命中的子项，脚本会给父级追加 `.child-active` 并自动展开。

4. 权限隐藏后没有可见子项。

如果某个父级下的子项全部因为权限隐藏，则不要渲染这个 `.menu-group`。不要输出一个没有子菜单项的空父级按钮。

## 6. 子菜单

子菜单使用统一结构：

```cshtml
<div class="menu-group">
    <button class="menu-item menu-submenu-toggle" type="button">
        <span><i class="bi bi-folder"></i>系统管理</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div class="menu-submenu">
        <a asp-page="/Users/Index" class="menu-item">
            <i class="bi bi-people"></i>用户管理
        </a>
        <a asp-page="/Roles/Index" class="menu-item">
            <i class="bi bi-shield"></i>角色管理
        </a>
    </div>
</div>
```

只标记子项 `active` 或 `aria-current="page"`。脚本会自动展开父级子菜单，并维护 `aria-expanded`、`.menu-submenu.open` 和 `.child-active`。

子菜单激活规则：

- 子项命中当前页面时，子项输出 `active` 或 `aria-current="page"`。
- 父级只负责展开时，父级按钮不输出 `active`。
- 父级也有页面入口时，把父级页面入口写成独立 `<a class="menu-item">`，不要和展开按钮合并。
- 同一个 `.menu-group` 可以同时包含一个主入口 `<a>` 和一个展开按钮，但两者必须是两个元素。

不要在页面里再写一套子菜单展开脚本。

## 7. 权限菜单和认证入口

菜单权限属于项目私有行为，应在 cshtml、PageModel、ViewModel 或服务端菜单模型中处理。

示例：

```cshtml
@if (User.Identity?.IsAuthenticated == true)
{
    <a asp-page="/Profile/Index" class="menu-item">
        <i class="bi bi-person"></i>个人资料
    </a>
}

@if (User.IsInRole("Admin"))
{
    <a asp-page="/Admin/Index" class="menu-item">
        <i class="bi bi-shield-lock"></i>管理员
    </a>
}
```

退出登录可以保留模板中的 ajax 行为，也可以按项目认证方式替换。替换时不要把认证逻辑写进 `modern-color-layout.js`。

## 8. 主题和移动端

主题按钮使用：

- `.theme-btn`：桌面浮动按钮。
- `.theme-menu-btn`：菜单内按钮。
- `data-theme="light"`：亮色。
- `data-theme="dark"`：暗色。
- `data-theme="auto"`：跟随系统。

主题值保存在 `localStorage` 的 `modern-color-layout-theme`。

移动端打开菜单时，脚本会把 `#menu` 移动到 `document.body`，让菜单在页面滚动后仍显示在 `#toggle-menu` 下方。切回桌面宽度后，脚本会把菜单移回 `.content-wrapper`。

不要写依赖 `#menu.parentElement` 永远等于 `.content-wrapper` 的代码。

### 8.1 局部导航和动态 DOM

普通 Razor Pages 完整导航会重新加载脚本，不需要额外处理。如果项目使用局部导航、HTML 局部替换或其他不会触发整页刷新的机制，应在新 DOM 已经写入页面后调用：

```javascript
window.ModernColorLayout.refresh();
```

`refresh()` 可以重复调用，会扫描当前页面中新出现的菜单、子菜单和主题按钮，并确保当前 DOM 的交互绑定有效且不会重复响应。框架自身的生命周期事件应在项目适配代码中订阅，再从适配代码调用 `refresh()`；不要把某个框架名称或对象直接写进 `modern-color-layout.js`。

例如，项目已有统一的页面更新事件时可以这样接入：

```javascript
document.addEventListener("page:updated", function () {
    window.ModernColorLayout.refresh();
});
```

## 9. 样式修改边界

可以放入 `modern-color-layout.css` 的内容：

- 颜色变量。
- 现代布局外壳。
- 菜单和子菜单。
- Bootstrap 常见控件适配。
- 表单控件各种状态。
- 移动端菜单和返回顶部按钮。

不要放入 `modern-color-layout.css` 的内容：

- 具体业务页面的特殊布局。
- 某个账号系统、交易系统、开发者后台的专属品牌样式。
- 只服务某个页面一次性展示的颜色。

可以放入 `modern-color-layout.js` 的内容：

- 主题切换。
- 菜单打开关闭。
- 子菜单展开。
- 菜单激活。
- 移动端菜单定位。
- 重复初始化保护。
- 为局部导航或动态 DOM 提供可重复调用的 `ModernColorLayout.refresh()`。

不要放入 `modern-color-layout.js` 的内容：

- 认证、退出登录、权限判断。
- 业务接口调用。
- 某个页面专属事件。

## 10. 回归检查

修改完成前至少检查：

- `Pages/ModernColorDemo.cshtml` 在亮色、暗色、自动模式下可读。
- 菜单项点击后能正确激活。
- hash 导航能激活对应菜单项。
- 子菜单子项激活时父级自动展开。
- 移动端滚动后菜单仍显示在菜单按钮下方。
- `button.menu-item` 不显示成浏览器原生白色按钮。
- 表单控件的正常、焦点、禁用、只读、校验状态都可读。
- 日期和时间控件在暗色模式下图标可见。
- 局部替换菜单或正文 DOM 后调用 `ModernColorLayout.refresh()`，新元素交互有效且已有元素不会重复响应。
- `dotnet build --no-restore` 通过。
- 文档和代码保持 UTF-8 BOM 与 CRLF。
