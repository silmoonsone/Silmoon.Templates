# 现代颜色布局 Blazor 使用说明（Agent）

本文给 Codex 或其他 AI Agent 使用，说明如何在 Blazor Razor 组件中使用现代颜色布局，并给出单一布局、多区域布局、分层菜单和权限菜单的通用组织方式。

本说明只针对 Blazor 结构，不记录某个具体业务项目。Razor Pages cshtml 页面请阅读同目录的 `modern-color-layout-static-agent-guide.md`。

## 1. 项目定位

Blazor 现代颜色布局可以用于普通用户页面、后台管理页面或其他组件区域，目标是让项目获得统一的现代视觉外壳，同时允许不同区域展示不同菜单、使用不同布局入口和执行各自的权限判断。

这套 Blazor 布局提供：

- 统一主题切换。
- 左侧菜单和移动端弹出菜单。
- 子菜单展开和 active 子项父级自动展开。
- 现代颜色 CSS 变量和 Bootstrap 控件适配。
- 公共认证菜单与按场景拆分的业务菜单。
- 单一布局和多区域布局两种组织方式。
- Blazor 版本演示页 `/backend/modern-color-demo`，用于回归验证布局、主题和控件状态。

## 2. 相关文件

Blazor 现代颜色布局通常涉及以下文件。应根据项目复杂度选择，不要求为了“分层完整”创建所有文件：

- `Components/Layout/ModernColor/ModernColorLayout.razor`：现代颜色公共视觉外壳，包含主题按钮、菜单按钮、菜单容器、正文区域、错误 UI 和初始化组件。单一布局项目中它可以直接是真正的路由 Layout；多区域项目中它也可以只是由具体 Layout 复用的普通组件。
- `Components/Layout/ModernColor/ModernColorLayoutInitializer.razor`：交互式初始化组件，负责通过 JS interop 加载现代颜色布局核心脚本和 Blazor 适配脚本，并启动生命周期适配。
- `Components/Layout/ModernColor/ModernColorMenu.razor`：多个区域共用的菜单部分，例如登录、注册、退出登录和菜单内主题按钮。如果认证菜单需要被顶栏、弹出菜单或其他布局独立复用，或者认证逻辑已经较复杂，可以自行新建独立认证菜单组件，并由 `ModernColorMenu.razor` 引用。
- `Components/Layout/ModernColor/UserNavMenu.razor`、`AdminNavMenu.razor`：按用户区、管理区或其他业务场景拆分的专属菜单。名称只是示例，应按业务语义命名。
- `Components/Layout/ModernColor/UserLayout.razor`、`AdminLayout.razor`：多区域项目中真正继承 `LayoutComponentBase` 的具体路由布局。
- 区域目录下的 `_Imports.razor`：为该目录指定具体布局，例如让管理页面统一使用 `AdminLayout`。
- `RazorPages/Backend/_Imports.razor`：演示后台目录级布局声明。单一布局模式下可以直接使用 `@layout ModernColorLayout`；多区域模式下必须使用 `BackendLayout`、`AdminLayout`、`UserLayout` 等真正继承 `LayoutComponentBase` 的具体 Layout，不能把只接收 `BodyContent` 的公共外壳组件写成 `@layout`。
- `RazorPages/Backend/ModernColorDemo.razor`：Blazor 演示页面，对应 `/backend/modern-color-demo`，用于验证布局、主题、菜单、表单控件、按钮、表格和暗色模式可读性。除非项目明确不保留演示页，否则建议保留或改造成同等覆盖面的内部样例页。
- `Components/App.razor`：Blazor 应用外壳，引用 Bootstrap、Bootstrap Icons、项目样式、`js/site.js` 和 Blazor 脚本。
- `wwwroot/css/modern-color-layout.css`：现代颜色布局核心样式。
- `wwwroot/js/modern-color-layout.js`：现代颜色布局核心脚本，公开可重复调用的 `ModernColorLayout.refresh()`，不依赖 Blazor。
- `wwwroot/js/modern-color-layout-blazor.js`：Blazor 生命周期适配脚本，在增强导航完成后调用布局刷新。
- `wwwroot/js/site.js`：项目脚本，包含通用 `ScriptLoader`。

如果项目已有 `MainLayout.razor`、`NavMenu.razor` 和对应隔离样式，并且希望保留原始模板文件，可以把现代颜色相关文件集中在独立子目录中，再从 `Routes.razor` 显式指定新的默认布局。不要仅为了引入现代颜色框架删除原布局文件。

## 3. 服务和路由

`Program.cs` 中需要启用 Razor Components 和 Interactive Server：

```csharp
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
```

如果目标项目使用 Silmoon 相关 JS interop 服务，也应按项目约定保留：

```csharp
builder.Services.AddJsComponentInterop();
builder.Services.AddJsSilmoonAuthInterop();
```

不要为了现代颜色布局改动无关认证流程、中间件、接口服务或数据服务。

## 4. 布局应用方式

先根据页面区域数量选择结构，不要默认创建多层 Shell、Layout 和转发组件。

### 4.1 单一布局项目

如果所有相关页面使用相同标题、菜单和认证入口，`ModernColorLayout.razor` 可以直接继承 `LayoutComponentBase`，并通过 `@Body` 输出页面正文。目录级 `_Imports.razor` 可以直接应用它：

```razor
@using {当前项目根命名空间}.Components.Layout.ModernColor
@layout ModernColorLayout
```

这种模式文件最少，适合只有一套菜单的项目。此时 `ModernColorLayout` 必须是真正的路由 Layout，不能只是接收 `BodyContent` 的普通组件。

### 4.2 多区域、多菜单项目

如果普通用户区、管理区、开发者区等页面需要不同菜单，推荐使用以下简洁分层：

```text
现代颜色公共外壳组件
├─ UserLayout  → UserNavMenu  + ModernColorMenu
├─ AdminLayout → AdminNavMenu + ModernColorMenu
└─ 其他 Layout → 对应场景菜单 + ModernColorMenu
```

各层职责：

- `ModernColorLayout.razor`：只负责现代颜色公共外壳，并通过 `MenuContent`、`BodyContent` 等参数接收可变内容。
- `UserLayout.razor`、`AdminLayout.razor`：真正的路由 Layout，继承 `LayoutComponentBase`，把自己的 `@Body` 传给公共外壳。
- `UserNavMenu.razor`、`AdminNavMenu.razor`：只表达该区域的业务入口和菜单权限。
- `ModernColorMenu.razor`：表达所有区域都需要的认证入口、退出登录和主题按钮。

如果采用多区域模式，`ModernColorLayout.razor` 可以作为公共外壳组件。它仍然应该保留完整的现代颜色布局骨架，只把标题、菜单和正文变成参数或片段。示意：

```razor
<nav id="menu" aria-label="@MenuLabel">
    <div class="menu-header">
        <h3>@Title</h3>
        <div class="text-secondary">@Subtitle</div>
    </div>
    @MenuContent
    <ModernColorMenu />
</nav>

<main class="content-main">
    @BodyContent
</main>

@code {
    [Parameter] public string Title { get; set; }
    [Parameter] public string Subtitle { get; set; }
    [Parameter] public string MenuLabel { get; set; } = "主菜单";
    [Parameter] public RenderFragment MenuContent { get; set; }
    [Parameter] public RenderFragment BodyContent { get; set; }
}
```

具体用户布局示意：

```razor
@inherits LayoutComponentBase

<ModernColorLayout Title="用户中心" Subtitle="User Center" MenuLabel="用户主菜单">
    <MenuContent>
        <UserNavMenu />
    </MenuContent>
    <BodyContent>
        @Body
    </BodyContent>
</ModernColorLayout>
```

管理布局使用同样结构，只替换标题和菜单组件：

```razor
@inherits LayoutComponentBase

<ModernColorLayout Title="管理后台" Subtitle="Administration" MenuLabel="管理主菜单">
    <MenuContent>
        <AdminNavMenu />
    </MenuContent>
    <BodyContent>
        @Body
    </BodyContent>
</ModernColorLayout>
```

`Routes.razor` 可以显式指定默认用户布局，而不修改或删除项目原有布局：

```razor
<RouteView RouteData="routeData" DefaultLayout="typeof(Layout.ModernColor.UserLayout)" />
```

管理目录再通过自己的 `_Imports.razor` 覆盖默认布局：

```razor
@using {当前项目根命名空间}.Components.Layout.ModernColor
@layout AdminLayout
```

这种方式由路由默认值和目录边界决定布局，不需要在一个布局中根据当前 URL 编写大量条件分支。

### 4.3 布局和外壳的硬边界

- 通过 `@layout` 或 `RouteView.DefaultLayout` 使用的类型必须继承 `LayoutComponentBase`，并通过继承得到的 `Body` 参数渲染页面正文。
- 如果 `ModernColorLayout` 被设计成接收 `BodyContent` 的普通公共外壳组件，就不要再写 `@layout ModernColorLayout`；应使用包装它的 `UserLayout`、`AdminLayout` 或其他具体布局。
- 普通公共外壳被误当成路由 Layout 时，项目可能仍能编译，但访问页面时会因为路由系统传入 `Body` 而产生运行时错误。因此必须实际访问各区域页面验证。
- 如果 `ModernColorLayout.razor` 已经承担公共外壳职责，不要再额外创建一个内容完全相同、只负责转发的 `ModernColorLayoutShell.razor`。
- 如果只有一套菜单，不要机械创建 `UserLayout`、`AdminLayout`、多个菜单组件和空转发层；使用 4.1 的单一布局模式即可。

如果业务项目只想让某个目录使用某个具体布局，应在那个目录单独放 `_Imports.razor`。不要把管理布局放到全局 `_Imports.razor`；全局默认布局应通过路由器或项目既有约定设置，区域布局再在目录中覆盖。

## 5. CSS 和 JS 加载

`ModernColorLayout.razor` 通过 `<HeadContent>` 引入样式。无论它本身是真正的 Layout，还是由具体 Layout 复用的普通组件，都应由这个现代颜色外壳统一加载核心样式，不要在每个具体 Layout 中重复引用：

```razor
<HeadContent>
    <link rel="stylesheet" href="/css/modern-color-layout.css?v=16" />
</HeadContent>
```

不要在 `Components/App.razor` 中直接引用 `modern-color-layout.css` 或 `modern-color-layout.js`。

`Components/App.razor` 可以引用 Bootstrap、Bootstrap Icons、项目样式、公共脚本和 `js/site.js`。`site.js` 提供通用 `ScriptLoader.ensureLoaded(src)`，由 `ModernColorLayoutInitializer.razor` 依次动态加载 `/js/modern-color-layout.js` 和 `/js/modern-color-layout-blazor.js`。

`ModernColorLayoutInitializer.razor` 必须是交互式子组件：

```razor
@rendermode InteractiveServer
@inject IJSRuntime Js
```

这样可以避免让包含 `RenderFragment Body` 或 `BodyContent` 的 `ModernColorLayout.razor` 直接成为 interactive 组件。不要把初始化器合并回 `ModernColorLayout.razor`。

初始化器应通过通用脚本加载器调用现代颜色布局：

```csharp
await Js.InvokeVoidAsync("ScriptLoader.ensureLoaded", "/js/modern-color-layout.js?v=3");
await Js.InvokeVoidAsync("ScriptLoader.ensureLoaded", "/js/modern-color-layout-blazor.js?v=1");
await Js.InvokeVoidAsync("ModernColorLayoutBlazor.init");
```

`ModernColorLayoutBlazor.init()` 会立即调用一次 `ModernColorLayout.refresh()`，然后只注册一次 Blazor `enhancedload` 监听。Blazor 在增强导航后替换页面或布局 DOM 时，适配脚本会再次刷新当前布局，因此从用户区切换到管理区等场景不需要手动刷新浏览器。

`modern-color-layout.js` 是通用核心，不应直接访问 `window.Blazor`。以后接入其他动态页面框架时，应新增对应适配代码，在该框架完成 DOM 更新后调用 `ModernColorLayout.refresh()`，不要继续向核心脚本加入框架判断。

## 6. 布局结构

`ModernColorLayout.razor` 是现代颜色框架的核心 DOM 骨架。无论它是单一项目中的真正路由 Layout，还是多区域项目中的公共外壳组件，都应保留这些结构：

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

可以通过参数或子组件替换菜单文案、菜单项、图标、认证组件和业务入口，但不要在每个具体 Layout 中复制这些基础结构。`ModernColorLayout.razor` 应该是唯一维护主题按钮、菜单按钮、移动端菜单定位、错误 UI 和初始化组件的位置。

## 7. 菜单自定义和权限控制

单一布局模式下，`ModernColorLayout.razor` 可以直接包含默认菜单。多区域模式下，业务菜单应由 `MenuContent` 提供，例如 `UserNavMenu`、`AdminNavMenu` 等场景菜单；`ModernColorLayout.razor` 只负责现代颜色外壳和公共菜单位置。

多区域项目优先把菜单拆成两层，而不是让一个巨大菜单组件同时判断 URL、区域、角色和所有权限：

- 场景菜单：例如 `UserNavMenu`、`AdminNavMenu`，只包含该区域的业务入口。
- 公共菜单：例如 `ModernColorMenu`，包含所有区域共用的登录、注册、退出登录和主题按钮。

具体 Layout 负责选择场景菜单，`ModernColorLayout.razor` 负责渲染现代颜色外壳，并可以在场景菜单之后追加公共菜单。不要在 `modern-color-layout.js` 中根据 URL 决定加载哪个业务菜单。

如果某个入口暂时对所有已登录用户显示、以后才增加权限，可以先保留简单的 `NavLink`，后续只在场景菜单中增加条件，不需要修改公共外壳。例如管理入口可以用 `<hr />` 与普通用户入口隔离：

```razor
<hr />
@if (CanEnterAdministration)
{
    <NavLink class="menu-item" href="/admin">
        <i class="bi bi-shield-lock"></i>后台管理
    </NavLink>
}
```

权限必须分层理解：

1. 菜单可见性用于改善界面体验。没有权限的入口不渲染。
2. 页面路由仍必须使用 `[Authorize]`、角色、Policy 或等价机制保护。隐藏菜单不等于禁止直接访问 URL。
3. 重要业务操作和数据访问仍必须在服务或接口层验证权限。页面和菜单判断不能替代服务端授权。

认证状态或权限需要异步读取时，可以让对应菜单组件成为交互式子组件，例如在 `ModernColorMenu` 或场景菜单中使用 `@rendermode InteractiveServer`。不要为了一个交互式菜单把包含页面 `RenderFragment` 的整个 Layout 设置成 interactive。

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

如果单个场景菜单复杂，可以让菜单组件接收用户信息、权限集合或菜单模型，但最终输出的 DOM 仍应使用 `.menu-item`、`.menu-group`、`.menu-submenu-toggle` 和 `.menu-submenu`。不要再额外创建一个只包裹场景菜单、没有自身职责的菜单转发组件。

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

认证入口通常属于多个区域共用的菜单。最简洁的模式是由 `ModernColorMenu.razor` 直接负责：

- 未登录时显示登录和注册。
- 已登录时显示退出登录、用户中心等公共入口。
- 在认证入口之后显示菜单内主题按钮。

如果认证逻辑只在 `ModernColorMenu` 中使用，不必再创建额外组件。如果认证菜单还会被顶栏、弹出菜单或其他布局独立复用，或者认证逻辑已经较复杂，再自行拆成独立认证菜单组件，并由 `ModernColorMenu.razor` 引用。

实际项目可以：

- 直接修改 `ModernColorMenu` 或独立认证组件，以适配自己的登录、注册、退出登录路径。
- 根据用户是否登录输出不同菜单项。
- 根据角色或权限输出用户中心、管理入口、退出登录等操作。
- 把确认退出、退出中状态和退出失败反馈保留在交互式 Blazor 组件中。

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
- 为动态 DOM 提供可重复调用的 `ModernColorLayout.refresh()`。

`modern-color-layout-blazor.js` 只负责：

- 首次启动时刷新当前布局。
- 订阅一次 Blazor `enhancedload`。
- 每次增强导航完成后刷新当前布局。

项目私有行为应放在：

- `ModernColorMenu.razor` 或需要独立复用的认证菜单组件。
- `UserNavMenu.razor`、`AdminNavMenu.razor` 等场景菜单组件。
- `UserLayout.razor`、`AdminLayout.razor` 等具体路由布局。
- 目标项目自己的服务和组件。
- `site.js` 中的项目私有脚本。
- 目标项目自己的私有 CSS。

## 12. 回归检查

修改完成前至少检查：

- `/backend/modern-color-demo` 或同等覆盖面的代表性业务页在亮色、暗色、自动模式下可读。
- `Components/App.razor` 没有直接引用 `modern-color-layout.css` 或 `modern-color-layout.js`。
- `ModernColorLayoutInitializer.razor` 可以通过 JS interop 加载脚本并重复调用初始化。
- 从一种布局增强导航到另一种布局后，子菜单无需刷新浏览器即可展开。
- 在用户区和管理区之间往返导航后，布局交互仍然有效且不会重复响应一次点击。
- `#blazor-error-ui` 默认隐藏，只在真实 Blazor 错误时出现。
- `RazorPages/Backend/ModernColorDemo.razor` 如果被保留，应能正常访问，并使用现代颜色布局。
- 路由器默认布局指向预期的具体 Layout，区域 `_Imports.razor` 能正确覆盖默认布局。
- 所有通过 `@layout` 或 `RouteView.DefaultLayout` 使用的类型都继承 `LayoutComponentBase` 并正确渲染 `@Body`。
- 用户区、管理区和其他区域分别显示自己的场景菜单，同时都能显示公共认证菜单。
- 现代颜色公共外壳没有因为组件同名或命名空间解析而意外引用项目原有的旧菜单。
- 隐藏受限菜单项后，直接访问对应 URL 仍会被 `[Authorize]`、角色或 Policy 拒绝。
- `NavLink` 激活子项时父级子菜单自动展开。
- 移动端滚动后菜单仍显示在菜单按钮下方。
- `button.menu-item` 不显示成浏览器原生白色按钮。
- 表单控件、按钮、表格、提示框在暗色模式下可读。
- `dotnet build --no-restore` 通过。
- 不只依赖编译结果；实际访问每一种具体布局覆盖的页面，避免普通外壳误用为路由 Layout 的运行时错误。
- 文档和代码保持 UTF-8 BOM 与 CRLF。
