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
- `wwwroot/css/site.css`：项目级全局样式，包含手机端触摸缩放策略，不属于现代颜色核心样式。
- `Pages/Shared/_BlankLayout.cshtml`：底层空白布局，提供 HTML head、Bootstrap、Bootstrap Icons 和基础脚本。

项目私有样式和脚本应放在当前项目自己的 CSS/JS 文件中，不要混入 `modern-color-layout.css` 或 `modern-color-layout.js`。

cshtml 基础布局中的 viewport 使用 `minimum-scale=1.0`、`maximum-scale=1.0` 和 `user-scalable=no` 禁止页面缩放，`wwwroot/css/site.css` 再使用 `touch-action: pan-x pan-y` 保留单指滚动并抑制双指缩放和双击放大。应在基础布局和项目级样式中维护这项站点策略，不要为它修改现代颜色核心 CSS/JS 或添加重复的触摸事件脚本。

`Pages/Shared/_ModernColorThemeButtons.cshtml` 统一维护主题三按钮。桌面调用 `<partial name="_ModernColorThemeButtons" model="@(false)" />`，菜单调用时传 `@(true)`。桌面组直接放在 `.content-wrapper` 内；菜单组留在菜单内。

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
- `.modern-color-footer`（由基础布局输出，与菜单区域、正文同级）

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

- `.modern-color-menu-region`（包裹桌面菜单，限制吸附侧栏的滚动范围）
- `nav id="menu"`
- `.menu-item`
- `.menu-group`
- `.menu-submenu-toggle`
- `.menu-submenu`
- `.content-main`
- `.modern-color-footer`（由基础布局输出，与菜单区域、正文同级）
- `.theme-menu-btn`

可以替换：

- 菜单标题和副标题。
- 菜单项文案、图标和链接。
- 退出登录入口。
- 权限判断和显示条件。
- 页面主体内容。

不要改变 `#content`、`#toggle-menu`、`.content-wrapper` 的层级关系，除非同时确认 CSS 和 JS 仍然能处理桌面端与移动端菜单。

### 4.1 自定义页脚

现代颜色外壳统一在正文之后输出 `footer.modern-color-footer`。默认内容来自 `Pages/Shared/_ModernColorFooter.cshtml`，修改该 partial 即可调整整个站点的版权文字和链接。页脚与 `.modern-color-menu-region`、`.content-main` 同为 `.content-wrapper` 的直接子元素；菜单放在 `.modern-color-menu-region` 内，让菜单顶部保持吸附，并在页脚进入视口时缩小菜单可滚动高度，页脚横跨包含菜单在内的整个布局宽度；空正文和短页面靠底，长页面随正文滚动，不能放进卡片或使用固定定位。

单个页面可以通过 `Footer` section 替换默认内容，例如 `/ModernColorDemo` 使用的嵌套布局已支持转发：

```cshtml
@section Footer {
    <span>© @DateTime.Now.Year 示例公司</span>
    <nav class="modern-color-footer-links" aria-label="页脚导航">
        <a href="~/">返回首页</a>
    </nav>
}
```

只提供页脚内容，不要再嵌套 `<footer>`。自建二级布局时，应像 `_ModernColorLayoutDemo.cshtml` 一样向基础壳转发 `Footer` section；没有自定义 section 时使用默认 partial。核心样式兼容没有页脚的旧布局；只有 `.content-wrapper` 直接包含 `.modern-color-footer` 时，才启用正文和页脚的网格布局。

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
    <button class="menu-item menu-submenu-toggle" type="button" aria-controls="users-features-submenu">
        <span><i class="bi bi-list"></i>用户功能</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div id="users-features-submenu" class="menu-submenu">
        <a asp-page="/Users/Create" class="menu-item">创建用户</a>
        <a asp-page="/Users/Roles" class="menu-item">角色权限</a>
    </div>
</div>
```

这种场景下，主页面入口使用普通 `<a class="menu-item">`，展开按钮单独使用 `button.menu-submenu-toggle`。不要让同一个元素既负责导航又负责展开。

3. 父级只负责展开，没有自己的页面行为。

```cshtml
<div class="menu-group">
    <button class="menu-item menu-submenu-toggle" type="button" aria-controls="system-management-submenu">
        <span><i class="bi bi-folder"></i>系统管理</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div id="system-management-submenu" class="menu-submenu">
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
    <button class="menu-item menu-submenu-toggle" type="button" aria-controls="settings-submenu">
        <span><i class="bi bi-folder"></i>系统管理</span>
        <i class="bi bi-chevron-down menu-submenu-arrow"></i>
    </button>
    <div id="settings-submenu" class="menu-submenu">
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

如果菜单会被局部导航或 HTML 替换重建，应显式提供应用内稳定且唯一的子菜单 `id`，并让展开按钮的 `aria-controls` 与之对应。不要由 cshtml 动态输出 `aria-expanded`、`.open` 或 `.child-active`；这些交互状态由脚本维护并按稳定 `id` 恢复。完整页面重新加载后，内存中的展开状态会自然重置。

子菜单激活规则：

- 子项命中当前页面时，子项输出 `active` 或 `aria-current="page"`。
- 父级只负责展开时，父级按钮不输出 `active`。
- 父级也有页面入口时，把父级页面入口写成独立 `<a class="menu-item">`，不要和展开按钮合并。
- 同一个 `.menu-group` 可以同时包含一个主入口 `<a>` 和一个展开按钮，但两者必须是两个元素。

点击导航时只按本次点击项判断父级归属，不能再用旧页面尚未更新的 `aria-current="page"` 展开原父级；导航完成或刷新后，按新页面输出的激活项自动展开其父级。用户手动收起其他组的状态继续保留，不因导航到无关页面而重新展开，也不强制收起用户手动打开的其他组。

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

移动端打开菜单时，脚本会把 `#menu` 移动到 `document.body`，让菜单在页面滚动后仍显示在 `#toggle-menu` 下方。切回桌面宽度后，脚本会把菜单移回原桌面父容器，新布局中为 `.modern-color-menu-region`。

不要写依赖 `#menu.parentElement` 始终固定不变的代码。

### 8.1 局部导航和动态 DOM

普通 Razor Pages 完整导航会重新加载脚本，不需要额外处理。如果项目使用局部导航、HTML 局部替换或其他不会触发整页刷新的机制，应在新 DOM 已经写入页面后调用：

```javascript
window.ModernColorLayout.refresh();
```

`refresh()` 可以重复调用，会扫描当前页面中新出现的菜单、子菜单和主题按钮，并确保当前 DOM 的交互绑定有效且不会重复响应。Blazor 页面可显式调用同一核心中的 `ModernColorLayout.initBlazor()`；其他框架由项目适配代码订阅生命周期事件后调用 `refresh()`。

例如，项目已有统一的页面更新事件时可以这样接入：

```javascript
document.addEventListener("page:updated", function () {
    window.ModernColorLayout.refresh();
});
```

## 9. 样式修改边界

默认不要直接修改框架自带的 `wwwroot/css/modern-color-layout.css` 和 `wwwroot/js/modern-color-layout.js`。项目或页面定制应优先新增独立 CSS/JS，并在核心资源之后加载，通过样式覆盖、事件订阅或公开 API 扩展；只有确认外部扩展无法合理实现，而且需求属于框架通用能力时，才修改核心文件，并完成本文要求的全部回归检查。

普通按钮或按钮式链接只需使用 `class="btn"`，即可获得随主题变化的中性文字、背景和交互状态；`btn-sm`、`btn-lg` 可继续叠加。需要语义配色时添加 `btn-primary`、`btn-outline-primary` 等类。禁用按钮使用 `disabled`；禁用链接同时使用 `.disabled`、`aria-disabled="true"` 和 `tabindex="-1"`。

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

## 核心资源同步与发布

通用核心源位于 Silmoon.Templates 的模板 `wwwroot`。在相邻 Silmoon.Templates 仓库运行 `node tools/modern-color/manage.cjs --check` 检查全部引用目标；确认通用改动后运行 `--write` 同步。目标清单与可选压缩发布包见[现代颜色同步工具](../../../../tests/ModernColor/README.md)。业务菜单、页脚内容、布局组件和项目专用覆盖样式由各项目维护，不由资产同步覆盖。

Blazor 的资源版本由 `ModernColorLayoutInitializer` 集中管理，当前为 CSS v21、核心 JS v10；cshtml 继续使用 `asp-append-version` 内容哈希。发布压缩使用工具产物，源文件保持可读。新的布局应直接将桌面 `.theme-toggle-group` 渲染在 `.content-wrapper` 内；核心 JS 移动旧位置的处理仅用于旧布局兼容。
