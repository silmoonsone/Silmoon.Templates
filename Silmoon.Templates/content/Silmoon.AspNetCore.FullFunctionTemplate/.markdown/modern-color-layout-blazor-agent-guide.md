# 现代颜色布局 Blazor 使用说明（Agent）

本文给 Codex 或其他 AI Agent 使用，说明如何在 Blazor Razor 组件中使用现代颜色布局框架。

本文只适用于 ASP.NET 项目中的 Blazor 页面。静态 HTML、Razor Pages 或 MVC 视图请阅读同目录的 `modern-color-layout-static-agent-guide.md`。

## 1. 目标和状态

`Silmoon.AspNetCore.Id` 和 `Silmoon.AspNetCore.FullFunctionTemplate` 都已经实现 Blazor 现代颜色布局。两边的使用方式应保持一致。

当前 Blazor 相关文件结构：

- `Components\Layout\ModernColorLayout.razor`
- `Components\Layout\ModernColorLayoutInitializer.razor`
- `Components\Layout\ModernColorLayoutAuthMenu.razor`
- `RazorPages\Backend\_Imports.razor`
- `RazorPages\Backend\ModernColorDemo.razor`
- `wwwroot\css\modern-color-layout.css`
- `wwwroot\js\modern-color-layout.js`
- `wwwroot\js\site.js`

共享 CSS 和 JS 必须继续和 `HtmlColorScheme` 保持三处一致。Blazor 组件、认证菜单、`site.js` 加载器属于项目自己的集成代码，不要求和静态源项目存在同名文件。

## 2. 服务和路由

`Program.cs` 中应启用 Blazor Server Components：

```csharp
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
```

如果页面需要 Silmoon Blazor 交互，还应启用项目已有的 JS interop 服务：

```csharp
builder.Services.AddJsComponentInterop();
builder.Services.AddJsSilmoonAuthInterop();
```

不要为了现代颜色布局修改无关服务、中间件或认证流程。

## 3. 布局应用方式

后端 Blazor 页面通过目录级 `_Imports.razor` 使用现代布局：

```razor
@using 当前项目.Components.Layout
@layout ModernColorLayout
```

实际命名空间：

- `Silmoon.AspNetCore.Id`：`@using Silmoon.AspNetCore.Id.Components.Layout`
- `Silmoon.AspNetCore.FullFunctionTemplate`：`@using Silmoon.AspNetCore.FullFunctionTemplate.Components.Layout`

`RazorPages\Backend` 下的新 `.razor` 页面会自动使用 `ModernColorLayout`。不要把这个布局全局应用到无关 Blazor 页面，除非用户明确要求。

## 4. CSS 和 JS 加载

`ModernColorLayout.razor` 使用 `<HeadContent>` 引入共享 CSS：

```razor
<HeadContent>
    <link rel="stylesheet" href="/css/modern-color-layout.css?v=16" />
</HeadContent>
```

不要在 `Components\App.razor` 中直接引用 `modern-color-layout.css` 或 `modern-color-layout.js`。

`Components\App.razor` 可以引用 Bootstrap、Bootstrap Icons、项目样式、Silmoon 公共脚本和 `js/site.js`。`site.js` 中提供 `ModernColorLayoutLoader`，由初始化组件动态加载共享 JS。

`ModernColorLayoutInitializer.razor` 必须是交互式子组件：

```razor
@rendermode InteractiveServer
@inject IJSRuntime Js

@code {
    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender) await Js.InvokeVoidAsync("ModernColorLayoutLoader.ensureLoaded", "/js/modern-color-layout.js");
        await base.OnAfterRenderAsync(firstRender);
    }
}
```

`ModernColorLayoutLoader` 只负责确保 `/js/modern-color-layout.js` 加载一次，并调用 `ModernColorLayout.init()`。不要把认证、业务接口或项目私有逻辑写入共享 JS。

## 5. 布局结构

`ModernColorLayout.razor` 负责页面外壳：

- `#content`
- `.theme-toggle-group`
- `#toggle-menu`
- `.content-wrapper`
- `nav#menu`
- `.content-main`
- `#blazor-error-ui`
- `<ModernColorLayoutInitializer />`

不要让 `ModernColorLayout.razor` 自己使用 `@rendermode InteractiveServer`，因为布局包含 `RenderFragment Body`。需要交互的部分应拆成子组件，例如初始化器和认证菜单。

## 6. 菜单激活规则

Blazor 路由菜单使用 `NavLink`：

```razor
<NavLink class="menu-item" href="/dashboard">
    <i class="bi bi-speedometer2"></i>Dashboard
</NavLink>
```

`NavLink` 会根据当前路由添加 `active`。共享 JS 也识别 `aria-current="page"`，并会在子菜单子项激活时自动展开父级。

需要精确匹配时使用：

```razor
<NavLink class="menu-item" href="/backend/modern-color-demo" Match="NavLinkMatch.All">
    <i class="bi bi-palette2"></i>现代色彩Demo
</NavLink>
```

如果某个菜单代表一组动态路由，例如 `/users/edit/123`，而 `NavLink` 默认匹配不够准确，应由组件根据当前地址手动输出 `active` 或 `aria-current="page"`。

## 7. 子菜单规则

Blazor 子菜单使用和静态页相同的 DOM 结构：

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

不要恢复旧的 C# `expandedMenus` 状态。共享 JS 负责 `aria-controls`、`aria-expanded`、`.menu-submenu.open`、`.child-active` 和父级自动展开。

## 8. 项目私有行为

登录、注册、退出登录由 `ModernColorLayoutAuthMenu.razor` 处理。该组件属于项目私有集成，不是共享框架。

项目私有行为应放在以下位置：

- Blazor 认证菜单组件。
- 项目自己的 `site.js`。
- 项目自己的私有 CSS。
- 项目自己的布局文案和菜单项。

不要把项目认证、退出登录、API 调用或业务状态写入 `modern-color-layout.js`。

## 9. 回归检查

修改完成前至少检查：

- 三处 `modern-color-layout.css` hash 一致。
- 三处 `modern-color-layout.js` hash 一致。
- `node --check wwwroot\js\modern-color-layout.js` 通过。
- `dotnet build --no-restore` 通过。
- `Components\App.razor` 没有直接引用 `modern-color-layout.css` 或 `modern-color-layout.js`。
- `#blazor-error-ui` 默认隐藏，只在真实 Blazor 错误时出现。
- `ModernColorLayout.init()` 可以重复调用，不产生重复事件绑定。
- `NavLink` 激活子项时父级子菜单自动展开。
- 移动端滚动后菜单仍显示在按钮下方。
- `button.menu-item` 不显示成浏览器原生白色按钮。
