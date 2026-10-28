# 通用 Blazor 控件

本模板的通用控件位于 `Components/`，命名空间为 `Silmoon.AspNetCore.FullFunctionTemplate.Components`。可交互示例位于 `RazorPages/Backend/ComponentsDemo.razor`，路径为 `/backend/components-demo`。示例仅维护内存中的页面状态，不读取数据库或调用业务接口。

## 接入条件

- 使用 `@bind-Value`、`ValueChanged`、`ItemSelected` 或组件引用方法时，需要模板现有的 Interactive Server 渲染。静态 SSR 不执行 Blazor 事件和 `OnAfterRenderAsync`，但 `DropdownSelect` / `DropdownMenu` 的真实 `Href`、原生 JS 调用的确认框及纯外观的 `ContentCard` 可用于静态内容。
- 不需要新增 DI 服务。确认框、通用下拉框和多级菜单在组件内部用隐藏的 `silmoon-module` 声明同名 `.razor.js`，由现有 `wwwroot/js/site.js` 注册的通用加载入口按组件出现时导入；初次静态 SSR、cshtml、增强导航和交互插入均适用。`App.razor`、`_BlankLayout.cshtml` 不再逐个引用组件脚本。日期范围、枚举和目录控件保留自己的交互阶段导入与释放逻辑。
- 保留 `Components/App.razor` 引用的应用隔离样式 bundle、Bootstrap 5 bundle（含 Popper）和 Bootstrap Icons。复制组件时也要携带同名 `.razor.css`、`.razor.js` 及所用值类型；枚举和目录选择器还依赖 `wwwroot/js/picker-popover.js`，不能只复制 `.razor`。
- 复制确认框、通用下拉框或多级菜单时，还需保留宿主的 `site.js` 通用模块加载入口。组件使用 `NavigationManager` 生成带应用基路径的绝对模块地址；多实例共享浏览器模块缓存，移除实例不会卸载页面级共享模块。导入失败会记录控制台错误。
- 控件优先使用现代颜色布局的 CSS 变量。按 [Blazor 布局指南](modern-color-layout-blazor-agent-guide.md) 加载主题；`DropdownMenu` 自带 Bootstrap 变量和字面值回退，不要求引入整个现代布局。其他控件按自身依赖检查文字、背景、边框、焦点和 `--control-color-scheme` 变量。业务样式放在独立文件，勿改共享主题核心来适配单页。
- `EnumSelect` 和 `TimeInput` 继承 `InputBase<T>`，支持 `EditForm`、`ValidationMessage`、附加 HTML 属性及 `@bind-Value`。示例将它们放在 `EditForm` 中。

## 复制与旧项目迁移

1. 下拉框一起复制 `DropdownSelect.razor`、`.razor.css`、`.razor.js` 和 `DropdownSelectOption.cs`；多级菜单一起复制 `DropdownMenu.razor`、`.razor.css`、`.razor.js` 和 `DropdownMenuItem.cs`；确认框一起复制同名三文件和 `ConfirmDialogResult.cs`。适配目标命名空间，保留其本地化参数与业务封装，不把 `LanguageSelector` 或业务接口带入通用组件。
2. 将模板 `site.js` 中注册 `silmoon-module` 的通用代码合入目标现有 `site.js`。保留目标原有脚本和 `ScriptLoader`，不要整文件覆盖。每个使用组件的宿主只需加载一次 `site.js`，包括 cshtml/MVC 静态壳。
3. 保留应用隔离样式 bundle、Bootstrap 5 bundle（含 Popper）和 Bootstrap Icons；图标依赖通过目标 `libman.json` 恢复。迁移后检查 CSS 和字体文件，不能只修改依赖声明。
4. 移除 `App.razor`、`_BlankLayout`、`_ModernColorLayout` 等入口中这些组件的专用 `<script>`。保留组件内模块声明及确认框的方法内等待导入；不要改为只在 `OnAfterRenderAsync` 加载，否则纯静态 SSR 会失效。
5. 新增或修改组件隔离样式后更新样式 bundle 缓存引用，修改通用入口时更新 `site.js` 的缓存引用：cshtml 沿用 `asp-append-version`，采用 `@Assets` 的宿主保留其指纹机制，其余宿主更新现有查询版本。组件模块版本只在组件声明中维护；升级后完整刷新已加载旧模块的页面，不能仅依赖增强导航替换页面级监听。组件目录变化时，同时调整内部模块路径；`.razor` 不会展开 `~/`，静态 cshtml 也不一定有 `<base>`。
6. 检查首次完整加载、无控件页增强导航到有控件页、交互绑定、静态链接、多实例和慢速模块加载。静态页要确认菜单实际可打开，不能只检查生成了 `href`。出现控件并不会自动启用项目尚未注册的 Blazor 服务或渲染模式。

`ContentCard` 只需复制 `.razor` 和 `.razor.css`；旧 `AuthFormCard` 的文件与调用迁移见本指南的 ContentCard 小节。它没有组件脚本，不需要新增宿主脚本引用。

现代颜色 `manage.cjs --write` 只同步核心 CSS/JS，不处理上述组件、模块入口、样式 bundle、缓存版本或本手册。复制控件也不要求复制整个现代颜色布局；可复用现有主题变量和宿主。

### 已确认接入范围（2026-10-28）

下表记录模板及 11 个接收项目的源码接入范围；不表示它们具有相同组件集，也不表示所有项目都已通过完整构建。Hybrid 不在本次范围内。各项目的业务菜单、认证、本地化和页脚内容继续由各项目维护。

| 仓库 / Web 项目 | 本次控件及宿主差异 |
| --- | --- |
| Silmoon.Templates / 模板内容根 | `DropdownSelect`、`DropdownMenu`、`ConfirmDialog`、`ContentCard`；`Components/App.razor` 与 `Pages/Shared/_BlankLayout.cshtml` |
| Silmoon.Trading.Server / Silmoon.Trading.Server | 菜单、下拉选择、确认框及内容卡片；菜单最初来源于该项目；保留 `CloseLabel`、`LanguageSelector` 和原生 WebTrade 确认流程，本地化手册以该项目为准 |
| Snowfintech.AspNetCore.Portal / Snowfintech.AspNetCore.Portal | `DropdownSelect`、`DropdownMenu`、`ContentCard`；App 和 cshtml 宿主 |
| Silmoon.AspNetCore.AppHub / Silmoon.AspNetCore.AppHub | `DropdownSelect`、`DropdownMenu`、`ContentCard`；App 和 cshtml 宿主 |
| Silmoon.Blockchain.Service / Silmoon.Blockchain.TransactionHostServer | `DropdownSelect`、`DropdownMenu`、`ContentCard`；App 和 cshtml 宿主 |
| Huobao.AspNetCore.CenterServer / Huobao.AspNetCore.CenterServer | `DropdownSelect`、`DropdownMenu`、`ContentCard`；App 和 MVC Views 宿主 |
| Silmoon.AspNetCore.Api / Silmoon.AspNetCore.Api | `DropdownSelect`、`DropdownMenu`、`ContentCard`；App 和 cshtml 宿主 |
| Silmoon.AspNetCore.Blockchain / Silmoon.AspNetCore.Blockchain | `DropdownSelect`、`DropdownMenu`、`ContentCard`；App 和 cshtml 宿主 |
| Silmoon.AspNetCore / Silmoon.AspNetCore.Test | `DropdownSelect`、`DropdownMenu`、`ContentCard`；属于测试 Web 项目源码，不是类库 NuGet 导出的组件 |
| Silmoon.Cloudflare / Silmoon.Cloudflare.WebTesting | `DropdownSelect`、`DropdownMenu`、`ContentCard`；属于测试 Web 项目源码，不是 Cloudflare SDK 导出的组件 |
| Silmoon.Data / BlazorAppTest | `DropdownSelect`、`DropdownMenu`、`ContentCard`；保留 `@Assets`、`ImportMap` 和 `MapStaticAssets` 的静态资产机制 |
| Silmoon.AspNetCore.Url / Silmoon.AspNetCore.Url | 两个菜单控件与 `ContentCard` 位于 `RazorComponents`，模块地址随目录适配；MVC `<component>` 使用 `Server`／`Static`，现有交互脚本为 `blazor.server.js`，没有 `App.razor` |

多级菜单最初从 Trading 吸收到模板与 10 个接收项目；v3 定位、遮挡与键盘滚动修复已同步到 Trading 和这 10 个接收项目，连同模板共 12 个 Web 项目。Trading 的 WebTrade 偏好菜单显式保留末尾对齐，其余业务封装不变。菜单样式另提供 Bootstrap 变量／字面值回退，因此普通 Bootstrap 宿主无需引入整个现代颜色布局。Id、WebSite 未启用 Blazor，KnowledgeServer 为 Razor Pages，HtmlColorScheme 为纯 HTML，不加入组件；WinForms／MAUI Hybrid 仍不在本次 Web 范围内。

上表全部 12 个 Web 项目已同步 `DropdownMenu` v4、`DropdownSelect` v3 与 `ContentCard`：菜单增加淡入淡出和 `MenuWidth`，选择框对齐菜单的四方向及显示／消失行为，原 `AuthFormCard` 文件和调用迁移为通用内容卡片。共 120 个组件及值类型文件在适配命名空间和目录后核对一致，宿主隔离样式缓存同步更新。Trading 登录／注册保留原品牌、居中宽度和业务代码，语言选择器显式保留末尾对齐。

升级时一起更新组件的 Razor、CSS 与 JS，并更新宿主隔离样式缓存；不能只替换脚本。菜单默认宽度从 `15rem` 调整为 `12.5rem`，如需维持旧宽度，可在调用处显式设置 `MenuWidth="15rem"`。选择框默认起始对齐，如需维持末尾对齐，请显式设置 `AlignEnd="true"`。各项目测试和既有构建限制见组件验证记录；源码同步不代表提交、发布或部署。

各轮构建结果、依赖限制及浏览器验收见[组件验证记录](https://github.com/silmoonsone/Silmoon.Templates/blob/master/tests/BlazorComponents/README.md)。源码同步与版本提交、包发布和应用部署分别确认。

接收项目没有本手册副本时，以模板指南为通用接入说明；已有项目手册只维护自身差异和链接，无需为每个项目再复制整套手册。未启用 Blazor 或只有现代颜色核心的项目不因为核心资源同步而获得这些控件。

控件源码与示例页分别核对：当前上表的 11 个接收项目没有 `ComponentsDemo` 或对应通用控件演示页，`/backend/components-demo` 是模板的验证入口。接收项目的现有手册引用此入口及“更多交互示例”的组合用法；同步通用控件不会额外给业务项目添加演示路由。已有实际业务调用继续保留其页面结构和行为。

## ConfirmDialog：等待明确选择

```razor
<ConfirmDialog @ref="Dialog" />
<button type="button" @onclick="Ask">确认操作</button>

@code {
    ConfirmDialog? Dialog { get; set; }
    string Message { get; set; } = "";

    async Task Ask()
    {
        if (Dialog is null) return;
        var accepted = await Dialog.ConfirmAsync("是否继续？", title: "确认操作");
        Message = accepted ? "已确认" : "已取消";
    }
}
```

- `ConfirmAsync(message, title, confirmText, cancelText, danger)` 返回 `bool`，仅 `message` 必填。
- `ChooseAsync(message, alternativeText, title, confirmText, cancelText, danger)` 返回 `ConfirmDialogResult.Confirmed / Alternative / Cancelled`；分别判断结果，不能将“第二操作”当成主确认。
- `Id` 默认自动生成，显式传入时必须在页面中唯一；`Draggable` 默认 `true`。标题可拖动，关闭按钮不参与拖动，重新打开居中。
- 用户等待不受默认一分钟 JS interop 超时限制；取消、Esc、关闭、页面离开或实例释放结束等待。一个页面同时只显示一个确认框，其他实例发起的并发调用返回取消。
- 标题、正文、按钮文字为纯文本。调用失败会抛出异常，调用方应显示错误并停止操作；可复用既有 `AlertComponent`。原生 `<dialog>` 是模态窗口，不能依靠点击背景按钮移除已打开的实例。

模板的 `App.razor` 仍放置全局 `Id="site-confirm-dialog-template"` 模板，因此使用该宿主的页面都有一个确认框实例，模块由该实例加载。`ConfirmAsync` / `ChooseAsync` 也会等待同一模块，避免刚渲染便调用时的竞态。普通浏览器 JS 若需立即调用，可从模板声明读取模块地址后等待导入，无须在调用方维护路径和版本：

```javascript
const lifetime = new AbortController(); // 由宿主在页面或实例销毁时调用 lifetime.abort()。
const template = document.getElementById("site-confirm-dialog-template");
await import(template.dataset.moduleSrc);
const accepted = await window.SiteDialogs.confirm({
    title: "确认操作", message: "是否继续？", danger: false,
    signal: lifetime.signal
});
const choice = await window.SiteDialogs.choose({
    message: "请选择保存方式。", confirmText: "保存", alternativeText: "另存副本"
});
// choice: "confirm" / "alternative" / null。
```

`signal` 是可选 `AbortSignal`，由调用方持有 `AbortController` 并在销毁时取消。`SiteDialogs.dismiss(templateId)` 只取消指定模板的等待。Blazor 页面可使用自己的实例，无需通过全局模板调用。

## DropdownSelect：通用下拉选择

```razor
<DropdownSelect TValue="string" Items="Options" @bind-Value="Selected" Label="显示方式" />

@code {
    string Selected { get; set; } = "list";
    IReadOnlyList<DropdownSelectOption<string>> Options { get; } = [
        new() { Value = "list", Text = "列表" },
        new() { Value = "card", Text = "卡片" }
    ];
}
```

- 普通选项通过 `Value` / `ValueChanged` 或 `@bind-Value` 更新；需要交互渲染，不依赖任何语言或业务服务。
- `DropdownSelectOption<TValue>.Href` 输出真实链接，可用于纯静态 SSR。链接选择不触发 `ValueChanged`；`Disabled` 选项及整个禁用的控件不会输出可跳转链接。
- 选项支持 `Text`、`Language`、`Direction`、`Disabled`；控件支持 `Placeholder`、`IconClass`、`Class`、`AlignEnd`、`OpenUpward`、`EnhanceNavigation`（默认 `true`）及附加 HTML 属性。
- 方向与 `DropdownMenu` 一致：`OpenUpward`、`AlignEnd` 默认均为 `false`，即 LTR 页面向下、靠左；分别设为 `true` 可优先向上、靠右，组合得到四种展开方式。RTL 按逻辑起始／末端对齐，空间不足时视口避让优先。旧版本默认末端对齐的调用处，如需维持原效果，显式添加 `AlignEnd="true"`。
- 打开时淡入 180ms、关闭时淡出 140ms，退场期间不可重复选择；系统减少动态效果时跳过动画。值回调和真实链接按原方式立即执行，不等待淡出完成。值绑定、选项内容和链接语义保持原有契约。
- 面板使用原生 Popover 顶层，保留在组件 DOM 中以维持 Blazor 事件，避免被卡片裁切。支持上下方向键、Home、End、Escape、外部点击关闭和多实例互斥；窗口变化时重新定位，外部滚动时关闭。旧浏览器回退为普通定位；不支持 `::details-content` 的浏览器关闭时直接收起，保持选择和导航可用。
- 脚本只在控件出现后加载，组件内声明 `DropdownSelect.razor.js?v=3`；下载期间提前打开的菜单会在模块就绪后补齐定位。没有使用该控件的页面不请求它的脚本。更新时一起复制 Razor、CSS、JS，并更新隔离样式缓存，宿主不添加专用脚本引用。

```razor
<DropdownSelect TValue="string" Items="Options" @bind-Value="Selected" Label="显示方式" OpenUpward="true" AlignEnd="true" />
```

cshtml/MVC 中的纯链接示例（宿主需具备 Razor 组件服务及 Component Tag Helper）：

```cshtml
@using Silmoon.AspNetCore.FullFunctionTemplate.Components
@{
    var links = new[] {
        new DropdownSelectOption<string> { Value = "docs", Text = "文档", Href = "/docs" },
        new DropdownSelectOption<string> { Value = "help", Text = "帮助", Href = "/help" }
    };
}
<component type="typeof(DropdownSelect<string>)" render-mode="Static"
           param-Items="links" param-Value='@("docs")' param-Label='@("导航")' />
```

此例不需要启动 Blazor 交互脚本，但需要共同的 `site.js` 和组件样式；在深路径或子路径部署时，业务 `Href` 也应由宿主生成正确地址。`Static` 不支持 `ValueChanged`，需要回调时按目标项目现有模式改为交互宿主；旧 Blazor Server 项目使用 `Server`，不能机械替换为 Blazor Web App 的初始化方式。

## DropdownMenu：通用多级菜单

```razor
<DropdownMenu Items="MenuItems" ItemSelected="OnSelected" Label="更多操作" TriggerText="菜单" BackLabel="返回上一级" />

@code {
    string LastAction { get; set; } = string.Empty;
    IReadOnlyList<DropdownMenuItem> MenuItems { get; } = [
        new() { Key = "display", Text = "显示", IconClass = "bi bi-sliders", Children = [
            new() { Key = "list", Text = "列表", Selected = true },
            new() { Key = "more", Text = "更多", Children = [
                new() { Key = "compact", Text = "紧凑", Selected = false }
            ] }
        ] },
        new() { Key = "docs", Text = "文档", Href = "/docs" },
        new() { Key = "unavailable", Text = "暂不可用", Disabled = true }
    ];
    void OnSelected(DropdownMenuItem item) => LastAction = item.Key;
}
```

- 四文件一起复制；不需要新的 DI 服务。宿主须加载 Bootstrap 5 的 bundle（包含 Popper）、Bootstrap Icons、应用隔离样式和已有 `site.js` 通用模块入口。组件声明 `DropdownMenu.razor.js?v=4`，无需顶层专用 script。默认使用现代颜色变量，缺少时回退到 Bootstrap 变量及默认值。
- `Items` 是递归 `Children` 树，无固定层级上限，数据不得循环引用。`Key` 只供调用方识别，内部面板用位置路径关联，不要求每个业务 Key 全局唯一。`Children` 优先于 `Href`：非空分组只进入子菜单；启用的链接叶子原生跳转、不触发 `ItemSelected`；普通叶子才触发该回调。
- 叶子项的 `Selected` 为可空布尔值（分组不使用此字段）：null 不显示选中标记，false 预留标记位置，true 显示选中状态。组件不自动修改调用方的数据或选中值。`Disabled` 可禁用整个组件或单个选项；`IconClass`、`Class` 和 `AdditionalAttributes` 可定制外观。组件另提供 `Label`、`BackLabel`、`TriggerText`、`EnhanceNavigation`（默认 true）、`AlignEnd`（默认 false）、`OpenUpward`（默认 false）和 `MenuWidth`（默认 `12.5rem`）。
- `MenuWidth` 接受 CSS 宽度值，如 `200px`、`20rem`、`320px`；默认 `12.5rem` 在根字体为 16px 时等于 200px，并随根字体缩放。模板窄屏根字体为 14px 时对应 175px；需要始终指定 200px 时使用 `MenuWidth="200px"`。`MenuWidth="auto"` 按当前层内容自适应，内部使用 `max-content`，隐藏层和离场层不撑宽。固定宽度较窄时选项文字换行；可见视口的最大宽度限制始终优先于指定宽度。演示页可选择固定值或自适应，导航菜单另展示自适应效果。
- 浮层默认与触发器的逻辑起始侧对齐，在 LTR 页面向右展开；`AlignEnd="true"` 用于右上角等需要末端对齐的入口。默认向下、`OpenUpward="true"` 优先向上，可用空间不足时自动翻转并限制在可见视口内，长菜单内部滚动。支持原生 Popover 的浏览器使用顶层浮层，保留 Blazor DOM 与事件，脱离卡片裁切及侧栏层叠上下文；旧浏览器回退普通定位，仍可能受祖先裁切限制。调用方无需抬高卡片 z-index。
- 在通常的 LTR 页面，`OpenUpward` 与 `AlignEnd` 分别控制上下方向和左右对齐，可组合为下左（默认）、下右（仅 `AlignEnd="true"`）、上左（仅 `OpenUpward="true"`）、上右（两者均为 true）。RTL 页面按逻辑起始／末端对齐，视口避让优先于方向偏好。演示页提供两组独立选项。
- Bootstrap 保留开关和外部关闭行为，`data-bs-display="static"` 停止 Popper 写坐标，组件统一处理定位。浮层采用不透明背景；模块晚加载、层级高度变化、窗口与可见视口变化会补齐定位，外部滚动关闭，内部滚动保持打开。关闭、动态禁用和卸载都会清理顶层状态与跟踪帧。
- 整个菜单默认打开时淡入 180ms、关闭时淡出 140ms，无需额外开启。关闭后立即停止接收菜单操作，淡出完成后清理顶层浮层；快速重开会恢复根层并从当前透明度继续淡入。系统减少动态效果时直接切换，不播放淡入淡出；这些时长目前不是组件参数。
- 子菜单从右向左、返回从左向右滑动 240ms。进入项与返回来源项使用 Primary 背景及白字；返回动画结束后保持 300ms，再通过伪元素叠层在 200ms 内淡出，临时高亮不改变 `Selected`。系统减少动态效果时跳过这些动画。
- 上／下、Home／End 只在当前层导航，长菜单会在浮层内部滚动，使聚焦项保持可见；右方向键进入、左方向键返回，Escape 关闭并复焦。快速反向操作不会被旧动画完成回调覆盖；关闭重置到根层，卸载时取消动画和高亮并释放 Bootstrap 实例。多实例独立使用。
- 静态 SSR／cshtml 可以展开分组和点击真实链接，无须 Blazor 事件；`ItemSelected` 需要交互渲染。cshtml 使用 `<component type="typeof(DropdownMenu)" render-mode="Static" param-Items="items" />`，宿主服务条件与前述 DropdownSelect 相同。普通动作叶子不要用于没有交互渲染的页面。
- 不要求替换业务菜单；WebTrade 的偏好封装、语言服务和交易资源不属于这个通用组件。示例见 `/backend/components-demo`。

```razor
<DropdownMenu Items="MenuItems" MenuWidth="200px" TriggerText="固定 200px" />
<DropdownMenu Items="MenuItems" MenuWidth="20rem" TriggerText="固定 20rem" />
<DropdownMenu Items="MenuItems" MenuWidth="auto" TriggerText="当前层自适应" />
```

## DateTimeRangePicker：日期或日期时间范围

```razor
<DateTimeRangePicker IncludeTime="false" @bind-Value="DateRange" />
<DateTimeRangePicker @bind-Value="TimeRange" />

@code {
    DateTimeRangeValue? DateRange { get; set; }
    DateTimeRangeValue? TimeRange { get; set; }
}
```

`DateTimeRangeValue` 为 `sealed record(DateTimeOffset StartTime, DateTimeOffset EndTime, string? Label = null)`。`Value` / `ValueChanged` 使用可空值，`null` 表示全部时段；查询默认范围与实际数据读取由页面决定。

- `IncludeTime` 默认 `true`，可以在 Blazor 管理模式下动态切换，组件会重建浏览器实例并同步绑定值。`false` 使用日期输入，`true` 使用日期时间输入并保留毫秒。
- 输入按浏览器本地时区解释，确认后返回 UTC `DateTimeOffset`，起止端点均包含。仅日期模式涵盖开始与结束日期全天；跨夏令时的日期取当天第一个有效时刻至次日开始前一毫秒，不能假设每天固定 24 小时。
- 快捷项在两种模式下都生成完整日期范围；周一是周起点，近三天包含今天；“近30天”位于“本月”和“上月”之间，包含今天及此前 29 天，按本地日历计算而非固定小时数。本周／本月截止今天结束，月跨度会将月末夹到目标月最后一天。
- 编辑和快捷项只修改草稿；确认才通知宿主，取消／Esc 不通知。控件不会提交外层 `EditForm`，也不创建嵌套表单。
- 浏览器原生日期输入的外观由浏览器和操作系统决定，`color-scheme` 随页面主题继承；不要为它叠加重复图标反色或隐藏原生日期按钮。

异步应用时仅在成功后更新宿主值：

```razor
<DateTimeRangePicker Value="Range" ValueChanged="ApplyRangeAsync" />

@code {
    DateTimeRangeValue? Range { get; set; }

    async Task ApplyRangeAsync(DateTimeRangeValue? value)
    {
        await ReloadAsync(value); // 当前页面提供的数据加载方法。
        Range = value;
    }
}
```

回调期间禁止重复确认；成功后才提交新值，失败时保留已提交值、显示错误并允许重试。不要在异步操作完成前赋值，否则失败后宿主会保留尚未生效的范围。

### JS 管理模式

已有 JS 页面可以使用 `<DateTimeRangePicker JavaScriptManaged="true" IncludeTime="false" />`，保留 `mount / setValue / dispose` 接口：

```javascript
await import("/Components/DateTimeRangePicker.razor.js?v=4");
const picker = window.DateTimeRangePicker.mount(root, {
    onApply: async range => {
        try {
            await reloadData(range);
            picker.setValue(range);
        } catch (error) {
            showError(error); // 由宿主提供反馈，失败时不 setValue。
        }
    }
});
picker.setValue(initialRange);
// 移除 DOM 或离开页面前：
picker.dispose();
```

`root` 是对应实例的 `[data-date-time-range-picker]` 元素；`range` 为 `{ startTime, endTime, label }`，时间是 ISO UTC 字符串，也可以为 `null`。`reloadData`、`showError`、`initialRange` 均由宿主定义。JS 管理模式不运行 Blazor 回调，不要同时绑定两套状态；同一实例的 `JavaScriptManaged` 不可改变，需要变更时用 `@key` 重建。JS 模式切换日期／时间输入时，由宿主先释放旧实例再挂载。

## EnumSelect、TreePicker 与 TimeInput

```razor
<EditForm Model="Form">
    <EnumSelect TEnum="ViewMode" @bind-Value="Form.Mode" />
    <TimeInput class="form-control" @bind-Value="Form.Time" AllowEndOfDay="true" />
    <ValidationMessage For="() => Form.Time" />
</EditForm>
<TreePicker Folders="Folders" @bind-Value="Folder" AllowCreate="true" />

@code {
    FormModel Form { get; } = new();
    string[] Folders { get; } = ["/文档/入门/", "/素材/图片/"];
    string Folder { get; set; } = "/";

    public enum ViewMode
    {
        [System.ComponentModel.DataAnnotations.Display(Name = "列表", Description = "按行显示内容。")]
        List,
        [System.ComponentModel.DataAnnotations.Display(Name = "卡片", Description = "逐项显示内容。")]
        Cards,
    }

    sealed class FormModel
    {
        public ViewMode Mode { get; set; }
        public TimeSpan Time { get; set; } = TimeSpan.FromDays(1);
    }
}
```

- `EnumSelect<TEnum>` 要求 `struct, Enum`，默认列出所有枚举成员；可传 `Options: IReadOnlyCollection<TEnum>` 限定选项、`Disabled` 禁用，`ShowDescriptions` 默认 `true`。名称与描述使用 `DisplayAttribute` 的 `Name`、`Description`；未声明的初始值显示其字符串，不会自动选择第一项。它是单值选择器，不负责组合 `[Flags]`。
- `TreePicker` 接收 `Folders: IReadOnlyCollection<string>` 和字符串 `Value / ValueChanged`，提供 `Placeholder`、`AllowCreate`、`Disabled`。空值归一为根目录 `/`，目录前后使用 `/`；创建子目录只是更新字符串并回调，不写磁盘、不保存数据。新增单级名称不能为 `.`、`..` 或含 `/`、`\`、`*`。
- `TimeInput` 绑定 `TimeSpan`，以 `HH:mm` 输入，默认允许 `00:00` 至 `23:59`；`AllowEndOfDay="true"` 增加 `24:00`，其值为 `TimeSpan.FromDays(1)`。它表达一天内的时间位置，不携带日期或时区；无效输入显示表单验证信息，不覆盖上一个有效值。
- 三者不需要页面手写 JS。枚举与目录组件负责外部点击、键盘相关监听和释放；时间输入完全由 Blazor 管理。
- 枚举和目录面板使用浏览器原生 Popover API，在顶层显示，保留 Blazor 对节点和事件的管理。它们可以放在带 `overflow: hidden` 的卡片或滚动容器内，面板按触发按钮定位并限制在可见视口内；不要通过全局取消卡片裁切或增加 `z-index` 代替组件定位。

## ContentCard：通用内容与表单卡片

```razor
<ContentCard Title="个人资料" Brand="我的应用" Description="更新页面显示名称。" Icon="bi-person-circle" MaxWidth="480px" Centered="true">
    <div class="card-form">
        <label class="form-label" for="profile-name">显示名称</label>
        <input id="profile-name" class="form-control" />
        <div class="card-actions">
            <button type="button" class="btn btn-primary">保存</button>
        </div>
    </div>
</ContentCard>
```

`ContentCard.razor` 与同名 `.razor.css` 一起复制，不需要 JS 或 DI 服务。`Title`、`Brand`、`Description`、`Icon` 均可省略；默认没有认证图标或品牌。正文通过 `ChildContent` 提供，可选页脚通过 `FooterContent` 提供，适合普通内容、设置、状态摘要或表单。

`Width` 和 `MaxWidth` 默认均为 `100%`，同时受父容器宽度限制；可使用 `MaxWidth="480px"` 限制表单宽度。`Centered` 默认 `false`，设为 `true` 时启用居中和页面外侧间距。标题默认是 h2，`HeadingLevel` 支持 1～6（越界钳制）；每个有标题的实例生成独立、稳定的标题 ID 与 `aria-labelledby`，无标题时不输出空标题。`Class` 和附加 HTML 属性用于卡片 section，子内容字段 ID 由调用方保证唯一。

可选表单样式使用 `card-form`、`card-fields`、`card-actions`、`card-note`、`card-feedback`、`card-password` 等类；普通内容不需要这些类，卡片不会给任意嵌套表单强加认证布局。

```razor
<ContentCard Title="任务摘要" Icon="bi-list-check">
    <ChildContent><p>这里可以展示任意页面内容。</p></ChildContent>
    <FooterContent><a href="/tasks">查看全部任务</a></FooterContent>
</ContentCard>
```

从旧 `AuthFormCard` 迁移时，将组件及两个文件改名为 `ContentCard`，将内容中的 `auth-*` 表单样式类改为对应的 `card-*`。需要维持原认证页外观时显式设置 `Centered="true" MaxWidth="480px" HeadingLevel="1"`，并传入原图标、品牌和文案；登录、注册逻辑继续由页面维护。更新宿主隔离样式缓存，不保留旧组件包装层。

卡片没有认证、提交或请求逻辑。简单错误提示继续使用已有 `<AlertComponent Message="..." />`。

## 生命周期与验证入口

`/backend/components-demo` 主区提供确认与选择、两种日期绑定、通用下拉选择、多级菜单、枚举／时间表单和逻辑目录，最后展示简洁的全宽 `ContentCard` 及页脚。下拉选择和菜单的方向／对齐参数与触发按钮分行排列，菜单另可切换固定／自适应宽度。

示例导航使用相对应用基路径的 `backend/components-demo#input-heading` 等地址，保留当前页面路径；有 `<base href="/">` 的宿主中，单独的 `#input-heading` 会解析到站点首页，不能用于这里的页内跳转。

页尾“更多交互示例”默认折叠。展开后可验证确认框延迟移除／重挂与第二实例、异步日期失败重试、日期模式切换，以及日期输入不会提交外层表单。“内容卡片与表单组合”包含最大宽度 480px 的居中资料表单和省略品牌、图标及描述的简洁卡片；预览资料只更新页面提示，折叠／重新展开保留当前输入。页面只有一个 h1，分组使用 h2，组内卡片通过 `HeadingLevel="3"` 使用 h3。

维护时检查亮／暗／自动主题、窄屏、键盘、增强导航返回、多实例和组件移除；浮层还需检查卡片外区域、相邻卡片遮挡、内外层滚动与窗口缩放。确认／日期依赖原生 `<dialog>`，枚举／目录依赖 Popover API；浮层表面使用实色，遮罩可保持半透明。实际浏览器行为需在目标环境验证，不能仅由构建或脚本测试推断。

这些组件不提供身份认证、权限、数据持久化、文件系统访问、后端请求或领域业务规则。主题、布局和通用输入保持独立，业务能力由调用页面与服务提供。文件使用 UTF-8 BOM 与 CRLF。
