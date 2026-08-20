# FullFunctionTemplate 现代颜色布局 Blazor 使用说明（Agent）

本文给 Codex 或其他 AI Agent 使用，说明如何在当前模板项目的 Blazor Razor 组件中使用现代颜色布局。

本说明只针对当前模板项目的 Blazor 结构。Razor Pages cshtml 页面请阅读同目录的 `modern-color-layout-static-agent-guide.md`。

## 1. 项目定位

当前模板项目同时包含 cshtml 页面和 Blazor Razor 组件。Blazor 现代颜色布局用于 `/backend` 这类组件页面，目标是让模板创建出的项目可以直接获得一套现代后台外壳。

这套 Blazor 布局提供：

- 统一主题切换。
- 左侧菜单和移动端弹出菜单。
- 子菜单展开和 active 子项父级自动展开。
- 现代颜色 CSS 变量和 Bootstrap 控件适配。
- 认证菜单组件示例。
- `/backend/modern-color-demo` 作为 Blazor 版本演示页。

## 2. 相关文件

Blazor 现代颜色布局相关文件：

- `Components/Layout/ModernColorLayout.razor`：Blazor 后台布局外壳，包含主题按钮、菜单按钮、菜单、正文区域、错误 UI 和初始化组件。
- `Components/Layout/ModernColorLayoutInitializer.razor`：交互式初始化组件，负责通过 JS interop 确保现代颜色布局脚本已加载并调用初始化。
- `Components/Layout/ModernColorLayoutAuthMenu.razor`：认证菜单示例组件，负责登录、注册、退出登录相关菜单项。
- `RazorPages/Backend/_Imports.razor`：目录级布局声明，让 `RazorPages/Backend` 下的组件默认使用 `ModernColorLayout`。
- `RazorPages/Backend/ModernColorDemo.razor`：Blazor 演示页面，用于验证布局和控件状态。
- `Components/App.razor`：Blazor 应用外壳，引用 Bootstrap、Bootstrap Icons、项目样式、`js/site.js` 和 Blazor 脚本。
- `wwwroot/css/modern-color-layout.css`：现代颜色布局核心样式。
- `wwwroot/js/modern-color-layout.js`：现代颜色布局核心脚本。
- `wwwroot/js/site.js`：项目脚本，包含 `ModernColorLayoutLoader`。

## 3. 服务和路由

`Program.cs` 中需要启用 Razor Components 和 Interactive Server：

```csharp
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
```

如果模板项目使用 Silmoon 相关 JS interop 服务，也应按项目约定保留：

```csharp
builder.Services.AddJsComponentInterop();
builder.Services.AddJsSilmoonAuthInterop();
```

不要为了现代颜色布局改动无关认证流程、中间件、接口服务或数据服务。

## 4. 布局应用方式

当前模板通过目录级 `_Imports.razor` 应用布局：

```razor
@using Silmoon.AspNetCore.FullFunctionTemplate.Components.Layout
@layout ModernColorLayout
```

因此 `RazorPages/Backend` 下的新 `.razor` 页面会默认使用 `ModernColorLayout`。

如果业务项目只想让某个目录使用现代颜色布局，应在那个目录单独放 `_Imports.razor`。不要把 `@layout ModernColorLayout` 放到全局 `_Imports.razor`，除非确认所有 Blazor 页面都应该使用这套后台布局。

## 5. CSS 和 JS 加载

`ModernColorLayout.razor` 通过 `<HeadContent>` 引入样式：

```razor
<HeadContent>
    <link rel="stylesheet" href="/css/modern-color-layout.css?v=16" />
</HeadContent>
```

不要在 `Components/App.razor` 中直接引用 `modern-color-layout.css` 或 `modern-color-layout.js`。

`Components/App.razor` 可以引用 Bootstrap、Bootstrap Icons、项目样式、公共脚本和 `js/site.js`。`site.js` 提供 `ModernColorLayoutLoader`，由 `ModernColorLayoutInitializer.razor` 动态加载 `/js/modern-color-layout.js`。

`ModernColorLayoutInitializer.razor` 必须是交互式子组件：

```razor
@rendermode InteractiveServer
@inject IJSRuntime Js
```

这样可以避免让包含 `RenderFragment Body` 的布局组件直接成为 interactive 组件。不要把初始化器合并回 `ModernColorLayout.razor`。

## 6. 布局结构

`ModernColorLayout.razor` 应保留这些结构：

- `#content`
- `.theme-toggle-group`
- `#toggle-menu`
- `.content-wrapper`
- `nav#menu`
- `.menu-item`
- `.menu-group`
- `.menu-submenu-toggle`
- `.menu-submenu`
- `.content-main`
- `#blazor-error-ui`
- `<ModernColorLayoutInitializer />`

可以替换菜单文案、菜单项、图标、认证组件和业务入口，但不要破坏这些基础结构。

## 7. 菜单自定义和权限控制

`ModernColorLayout.razor` 里的菜单只是模板示例。业务项目可以根据认证状态、角色、权限、配置或菜单模型输出不同菜单。

简单权限菜单示例：

```razor
@if (CanViewDashboard)
{
    <NavLink class="menu-item" href="/dashboard">
        <i class="bi bi-speedometer2"></i>Dashboard
    </NavLink>
}

@if (CanManageUsers)
{
    <div class="menu-group">
        <button class="menu-item menu-submenu-toggle" type="button">
            <span><i class="bi bi-people"></i>用户管理</span>
            <i class="bi bi-chevron-down menu-submenu-arrow"></i>
        </button>
        <div class="menu-submenu">
            <NavLink class="menu-item" href="/users">
                <i class="bi bi-person-lines-fill"></i>用户列表
            </NavLink>
            <NavLink class="menu-item" href="/roles">
                <i class="bi bi-shield-lock"></i>角色权限
            </NavLink>
        </div>
    </div>
}
```

如果菜单复杂，可以新建当前项目自己的菜单组件，例如 `ModernColorLayoutMenu.razor`，再由 `ModernColorLayout.razor` 引用。菜单组件可以接收用户信息、权限集合或菜单模型，但最终输出的 DOM 仍应使用 `.menu-item`、`.menu-group`、`.menu-submenu-toggle` 和 `.menu-submenu`。

权限菜单渲染规则：

- 权限判断留在 Blazor 组件或服务中。
- 没有权限的菜单项不要渲染。
- 如果父级下所有子项都因为权限隐藏，则不要渲染这个 `.menu-group`。
- 不要渲染空的 `.menu-submenu`。
- 不要把权限判断、菜单模型解析或接口调用写进 `modern-color-layout.js`。

## 8. 菜单激活规则

普通 Blazor 路由使用 `NavLink`：

```razor
<NavLink class="menu-item" href="/dashboard">
    <i class="bi bi-speedometer2"></i>Dashboard
</NavLink>
```

需要精确匹配时使用：

```razor
<NavLink class="menu-item" href="/backend/modern-color-demo" Match="NavLinkMatch.All">
    <i class="bi bi-palette2"></i>现代色彩Demo
</NavLink>
```

`NavLink` 会根据当前路由输出 active 状态。脚本也识别 `aria-current="page"`，并会在子菜单子项 active 时自动展开父级。

如果某个菜单代表动态路由，例如编辑页、详情页或带参数路由，应由组件根据当前地址手动输出 `active` 或 `aria-current="page"`。

常见菜单模式：

1. 只有主菜单，没有子菜单。

```razor
<NavLink class="menu-item" href="/dashboard" Match="NavLinkMatch.All">
    <i class="bi bi-speedometer2"></i>Dashboard
</NavLink>
```

这种菜单项本身就是页面入口，优先使用 `NavLink` 处理 active。

2. 主菜单本身是页面入口，同时下面还有子菜单。

```razor
<div class="menu-group">
    <NavLink class="menu-item" href="/users" Match="NavLinkMatch.All">
        <i class="bi bi-people"></i>用户总览
    </NavLink>
    <button class="menu-item menu-submenu-toggle" type="button">
        <span><i class="bi bi-list"></i>用户功能</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div class="menu-submenu">
        <NavLink class="menu-item" href="/users/create">创建用户</NavLink>
        <NavLink class="menu-item" href="/users/roles">角色权限</NavLink>
    </div>
</div>
```

这种场景下，主页面入口和展开按钮必须是两个元素。不要让 `NavLink` 同时承担展开按钮职责。

3. 父级只负责展开，没有自己的页面行为。

```razor
<div class="menu-group">
    <button class="menu-item menu-submenu-toggle" type="button">
        <span><i class="bi bi-folder"></i>系统管理</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div class="menu-submenu">
        <NavLink class="menu-item" href="/users">用户管理</NavLink>
        <NavLink class="menu-item" href="/roles">角色管理</NavLink>
    </div>
</div>
```

这种场景下，父级按钮永远不要输出 `active` 或 `aria-current="page"`。只让命中的子项 active，脚本会给父级追加 `.child-active` 并自动展开。

4. 动态路由属于某个菜单项。

如果 `/users/edit/123` 应归属于 `/users` 菜单，而 `NavLink` 默认匹配不能满足需求，可以注入 `NavigationManager`，根据当前 URL 手动输出 active：

```razor
@inject NavigationManager Navigation

<a class="menu-item @(IsUsersSection ? "active" : null)"
   aria-current="@(IsUsersSection ? "page" : null)"
   href="/users">
    <i class="bi bi-people"></i>用户管理
</a>

@code {
    private bool IsUsersSection
    {
        get
        {
            var path = new Uri(Navigation.Uri).AbsolutePath;
            return path.Equals("/users", StringComparison.OrdinalIgnoreCase)
                || path.StartsWith("/users/", StringComparison.OrdinalIgnoreCase);
        }
    }
}
```

手动 active 时仍然只标记真正代表当前页面或当前栏目的一项。

## 9. 子菜单

Blazor 子菜单使用和 cshtml 相同的 DOM 结构：

```razor
<div class="menu-group">
    <button class="menu-item menu-submenu-toggle" type="button">
        <span><i class="bi bi-folder"></i>后台页面</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div class="menu-submenu">
        <NavLink class="menu-item" href="/dashboard">
            <i class="bi bi-speedometer2"></i>Dashboard
        </NavLink>
        <NavLink class="menu-item" href="/upload">
            <i class="bi bi-cloud-upload"></i>Upload
        </NavLink>
    </div>
</div>
```

不要恢复旧的 C# `expandedMenus` 状态。脚本负责 `aria-controls`、`aria-expanded`、`.menu-submenu.open`、`.child-active` 和父级自动展开。

子菜单激活规则：

- 子项命中当前页面时，子项使用 `NavLink` 自动 active，或手动输出 `active` / `aria-current="page"`。
- 父级只负责展开时，父级按钮不输出 active。
- 父级也有页面入口时，把父级页面入口写成独立 `NavLink` 或 `<a class="menu-item">`。
- 同一个 `.menu-group` 可以同时包含一个主入口和一个展开按钮，但两者必须是两个元素。
- 子项 active 后，脚本会自动展开父级，不需要 C# 状态保存展开状态。

## 10. 认证菜单

`ModernColorLayoutAuthMenu.razor` 是模板提供的认证菜单示例。

实际项目可以：

- 直接修改它以适配自己的登录、注册、退出登录路径。
- 替换为自己的认证菜单组件。
- 根据用户是否登录输出不同菜单项。
- 根据角色或权限输出用户中心、管理入口、退出登录等操作。

不要把认证、退出登录、token、session 或 API 调用写入 `modern-color-layout.js`。

## 11. 样式和脚本边界

可以放入 `modern-color-layout.css` 的内容：

- 主题变量。
- 布局外壳。
- 菜单、子菜单、移动端菜单。
- Bootstrap 常见控件适配。
- Blazor 页面中常见表单和表格状态。

可以放入 `modern-color-layout.js` 的内容：

- 主题切换。
- 菜单打开关闭。
- 子菜单展开。
- 菜单激活。
- 移动端菜单定位。
- 重复初始化保护。

项目私有行为应放在：

- `ModernColorLayoutAuthMenu.razor`
- 自定义菜单组件。
- 当前项目自己的服务和组件。
- `site.js` 中的项目私有脚本。
- 当前项目自己的私有 CSS。

## 12. 回归检查

修改完成前至少检查：

- `RazorPages/Backend/ModernColorDemo.razor` 在亮色、暗色、自动模式下可读。
- `Components/App.razor` 没有直接引用 `modern-color-layout.css` 或 `modern-color-layout.js`。
- `ModernColorLayoutInitializer.razor` 可以通过 JS interop 加载脚本并重复调用初始化。
- `#blazor-error-ui` 默认隐藏，只在真实 Blazor 错误时出现。
- `NavLink` 激活子项时父级子菜单自动展开。
- 移动端滚动后菜单仍显示在菜单按钮下方。
- `button.menu-item` 不显示成浏览器原生白色按钮。
- 表单控件、按钮、表格、提示框在暗色模式下可读。
- `dotnet build --no-restore` 通过。
- 文档和代码保持 UTF-8 BOM 与 CRLF。
