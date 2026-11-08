# 通用 Blazor 控件

库中的九个通用控件位于 `Silmoon.AspNetCore.Blazor.Components`。模板在 `/backend/components-demo` 提供交互示例，页面状态保存在内存中。应用布局、认证和简单错误提示 `AlertComponent` 由模板维护。

公共 API、DataGrid 模块用法和故障排查见[上层控件手册](https://github.com/silmoonsone/Silmoon.AspNetCore/blob/master/README/BlazorComponents.md)。3.2.0 发布包内附有 [README](https://www.nuget.org/packages/Silmoon.AspNetCore.Blazor/3.2.0)。运行上层示例项目 `Silmoon.AspNetCore.Test` 后，可在 `/component-test` 查看原生 Blazor 示例。

## 接入公共库

1. .NET 10 模板通过 `PackageReference` 引用 `Silmoon.AspNetCore.Blazor`；这九个控件从 3.2.0 版开始提供，该包目标框架为 `net10.0`。在 `_Imports.razor` 中添加 `@using Silmoon.AspNetCore.Blazor.Components`。升级已有宿主时，先核对同名本地组件、模型和调用方，再移除已替换的副本与脚本引用，避免类型冲突或旧监听器拦截操作。
2. 保留宿主原有的应用隔离样式文件（`应用名.styles.css`）。公共库的样式会被自动导入。控件可直接使用原生 Blazor 配色；模板在 `wwwroot/css/site.css` 将现代颜色传给控件。多级菜单需要 Bootstrap 5 bundle（含 Popper），菜单及调用方传入的 `bi-*` 图标使用 Bootstrap Icons。
3. 普通 Blazor Web App 随 Blazor 启动加载库初始化模块。`DropdownMenu`、`DropdownSelect` 和 `ConfirmDialog` 通过 `silmoon-blazor-module` 声明自己的模块，进入页面、增强导航或插入组件后才下载相应脚本。日期、枚举、目录选择器和表格在交互模式下自行导入模块。库内部的 `silmoon-blazor-module` 仅导入本库 `Components/` 下的模块。宿主页面自己的脚本应由该页按需导入。
4. 纯 cshtml/MVC 页面可以在布局中增加下面的库入口，用于没有 Blazor 运行时的静态菜单和确认框。模板的静态布局已包含此行。真实链接可用于静态渲染，`@bind-Value`、`ItemSelected` 等 .NET 回调需要交互式渲染。`EnumSelect` 和 `TimeInput` 可以直接与 `EditForm`、`ValidationMessage` 配合使用。

```cshtml
<script type="module" src="~/_content/Silmoon.AspNetCore.Blazor/js/component-modules.js"></script>
```

升级后刷新宿主隔离样式缓存，验证静态链接、增强导航、键盘与异步回调。原生 JS 调用使用库的 `_content/Silmoon.AspNetCore.Blazor/` 资源和应用基路径。现代颜色同步工具只维护布局核心 CSS/JS，公共控件随类库升级。

模板按页面启用交互。在需要 `@bind-Value`、确认回调或 Blazor 管理行的 Razor 页面顶部添加 `@rendermode InteractiveServer`，使页面状态和控件处在同一个交互组件树。示例见 `RazorPages/Backend/ComponentsDemo.razor`。

### 同时使用现代颜色与 Blazor 的宿主（2026-11-08）

现代颜色核心的 9 个接收位置中，以下 5 个 Web 宿主既引用现代布局，也实际注册 Blazor 交互服务和路由。公共控件以 NuGet 包分发；项目需要某个控件时直接使用，无需复制九套源码或添加无业务用途的演示页。

| 宿主 | 接入位置 |
| --- | --- |
| Silmoon.AspNetCore.FullFunctionTemplate | 现代颜色 Blazor 布局及 `/backend/components-demo`；也是主题映射和 cshtml 接入的参考宿主。 |
| Snowfintech.AspNetCore.Portal、Silmoon.AspNetCore.AppHub、Silmoon.Blockchain.TransactionHostServer | 现代颜色 cshtml 布局与交互式 Blazor 共存。核对应用包引用、Blazor 宿主隔离样式、`site.css` 主题映射和静态根布局的模块入口。 |
| Silmoon.Trading.Server | 持仓、历史和对平选单均使用 3.2.0 的 `DataGrid<TItem>` 和 `JavaScriptManaged="true"`。`WebTradePositions.razor.js` 导入公共模块的 `mount`，交易页提供行键、筛选和业务回调。日期范围等定制控件由 Trading 维护。 |

HtmlColorScheme 是静态 HTML；Id、WebSite 未启用交互 Blazor；KnowledgeServer 使用 Razor Pages。这四处继续接收现代颜色核心 CSS/JS。只有旧控件副本、没有现代颜色布局的其他 Blazor 项目不在这次迁移范围内。项目以后启用或移除交互路由时，需重新核对范围。

### 历史源码分发范围（2026-10-28）

下表是 2026-10-28 的源码分发记录，可用于查找升级时要移除的旧副本。各业务项目的当前引用版本和本地化参数需在切换前单独核对。

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

当时分发源码时，组件的 Razor、CSS 与 JS 需要一起更新。已改用公共库的项目请升级包并刷新宿主隔离样式缓存，不要恢复本地副本。菜单默认宽度从 `15rem` 调整为 `12.5rem`，如需维持旧宽度，可在调用处显式设置 `MenuWidth="15rem"`。选择框默认起始对齐，如需维持末尾对齐，请显式设置 `AlignEnd="true"`。

各轮构建结果、依赖限制及浏览器验收见[组件验证记录](https://github.com/silmoonsone/Silmoon.Templates/blob/master/tests/BlazorComponents/README.md)。源码同步与版本提交、包发布和应用部署分别确认。

接收项目没有本手册副本时，以模板指南为通用接入说明；已有项目手册只维护自身差异和链接，无需为每个项目再复制整套手册。未启用 Blazor 或只有现代颜色核心的项目不因为核心资源同步而获得这些控件。

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
- `Id` 默认自动生成，显式传入时须在页面中唯一。`Draggable` 默认为 `true`，`CloseLabel` 可自定义关闭按钮的无障碍文案。
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
- 选项支持 `Text`、`Description`、`IconClass`、`Language`、`Direction`、`Disabled`。控件可指定 `TriggerId`、`Placeholder`、`IconClass`、`Class`、方向参数以及附加 HTML 属性。`JavaScriptManaged="true"` 时可通过 `window.DropdownSelect.bind(root)` 管理 `value`、`disabled` 和 `close()`。
- 方向与 `DropdownMenu` 一致：`OpenUpward`、`AlignEnd` 默认均为 `false`，即 LTR 页面向下、靠左；分别设为 `true` 可优先向上、靠右，组合得到四种展开方式。RTL 按逻辑起始／末端对齐，空间不足时视口避让优先。旧版本默认末端对齐的调用处，如需维持原效果，显式添加 `AlignEnd="true"`。
- 打开时淡入 180ms、关闭时淡出 140ms，退场期间不可重复选择；系统减少动态效果时跳过动画。值回调和真实链接按原方式立即执行，不等待淡出完成。值绑定、选项内容和链接语义保持原有契约。
- 面板使用原生 Popover 顶层，保留在组件 DOM 中以维持 Blazor 事件，避免被卡片裁切。支持上下方向键、Home、End、Escape、外部点击关闭和多实例互斥；窗口变化时重新定位，外部滚动时关闭。旧浏览器回退为普通定位；不支持 `::details-content` 的浏览器关闭时直接收起，保持选择和导航可用。
- 脚本只在控件出现后加载。下载期间提前打开的菜单会在模块就绪后补齐定位。

```razor
<DropdownSelect TValue="string" Items="Options" @bind-Value="Selected" Label="显示方式" OpenUpward="true" AlignEnd="true" />
```

cshtml/MVC 中的纯链接示例（宿主需具备 Razor 组件服务及 Component Tag Helper）：

```cshtml
@using Silmoon.AspNetCore.Blazor.Components
@{
    var links = new[] {
        new DropdownSelectOption<string> { Value = "docs", Text = "文档", Href = "/docs" },
        new DropdownSelectOption<string> { Value = "help", Text = "帮助", Href = "/help" }
    };
}
<component type="typeof(DropdownSelect<string>)" render-mode="Static"
           param-Items="links" param-Value='@("docs")' param-Label='@("导航")' />
```

此例使用上方的静态库入口及应用隔离样式即可。业务 `Href` 由宿主生成。值回调需采用项目的交互渲染模式。

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

- 库提供组件、模型、隔离样式和 JS 模块。宿主提供 Bootstrap 5 bundle（含 Popper）和图标，纯 cshtml 页面按上文引入库初始化模块。
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
- 3.2.0 的已知例外：在 `America/Santiago` 的午夜夏令时跳变日（例如 2026-09-06），“上月”会多包含 9 月 1 日的时间。依赖严格月界的查询应核对传入端点；“近30天”未出现这个问题。
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

可通过 `Texts` 字典按默认中文文案覆盖标签、快捷项和提示；没有指定的项目保留默认文案。以下 JS 示例假定页面的 `<base>` 指向应用根目录，纯 cshtml 可改用 `Url.Content("~/_content/...")` 生成地址。已有 JS 页面可以使用 `<DateTimeRangePicker JavaScriptManaged="true" IncludeTime="false" />`，保留 `mount / setValue / dispose` 接口：

```javascript
await import(new URL("_content/Silmoon.AspNetCore.Blazor/Components/DateTimeRangePicker.razor.js?v=5", document.baseURI));
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
- 3.2.0 的生命周期限制：如果 `EnumSelect` 或 `TreePicker` 在首次模块导入完成前已被移除，迟到的初始化仍会执行，模块引用不会释放。频繁动态挂载这两个控件时，应将慢加载后立即离页纳入升级回归。
- 枚举和目录面板使用浏览器原生 Popover API，在顶层显示，保留 Blazor 对节点和事件的管理。它们可以放在带 `overflow: hidden` 的卡片或滚动容器内，面板按触发按钮定位并限制在可见视口内；不要通过全局取消卡片裁切或增加 `z-index` 代替组件定位。

## DataGrid：可排序、筛选的数据表格

```razor
@using Silmoon.AspNetCore.Blazor.Components

<DataGrid TItem="string" Items="Names" RowKey="name => name" Label="控件"
          FilterLabel="筛选控件" EmptyFilterText="没有匹配项" SingleSelect="true"
          OnSelectionChanged="key => Selection = key">
    <Header><th scope="col"><button type="button" data-grid-sort="name">名称</button></th></Header>
    <RowTemplate Context="name"><td>@name</td></RowTemplate>
</DataGrid>
<output>@Selection</output>

@code {
    string[] Names = ["DataGrid", "ContentCard"];
    string? Selection;
}
```

`Items` 是已加载的数据。数据会增删或重排时，传入稳定且唯一的 `RowKey`。交互式 Blazor 按需导入库模块，点击列标题依次按升序、降序、原始顺序排列。筛选在浏览器执行。数字单元格用 `data-grid-type="number"`，可通过 `data-grid-value` 指定用于排序的原始值。静态 SSR 可以显示行，交互操作需要交互式渲染或由调用方挂载 JS。

`OnRowClick`、`OnRowDoubleClick` 接收 `DataGridRowEvent<TItem>`，包含记录、键、列键和从 0 开始的可见行号与列号。开启 `SingleSelect` 后可用方向键选择行，`OnSelectionChanged` 接收所选键，取消选择时为 `null`。行内按钮和链接保留自己的操作。

数据由浏览器维护时，用 `JavaScriptManaged="true"` 渲染表壳，按应用的基地址导入 `_content/Silmoon.AspNetCore.Blazor/Components/DataGrid.razor.js`，调用模块导出的 `mount(root, { getKey, createRow })`。`createRow` 返回含单元格的 `tr`。通过返回对象的 `setItems(items)` 更新数据，移除时调用 `dispose()`。表格无需加载模板脚本、Bootstrap 或现代颜色布局。可在宿主设置 `--data-grid-max-height`、`--data-grid-header-bg`、`--data-grid-selected-bg` 等变量。

从旧的 `window.DataGrid.mount` 迁移时，删除宿主布局中指向 `Components/DataGrid.razor.js` 的全局 `<script>`。下面的 `root` 是实际的 `[data-grid]` 元素，`options` 是原业务的取键、建行和回调配置；Blazor 页面的 `<base>` 应指向应用根目录（含末尾 `/`）：

```javascript
const url = new URL("_content/Silmoon.AspNetCore.Blazor/Components/DataGrid.razor.js", document.baseURI);
const { mount } = await import(url.href);
const grid = mount(root, options);
grid.setItems(items);
// 页面移除时调用 grid.dispose()；增强导航返回后，对新的根元素重新挂载。
```

纯 cshtml 页面若没有 `<base>`，用 `Url.Content("~/_content/Silmoon.AspNetCore.Blazor/Components/DataGrid.razor.js")` 从服务端传入模块地址。切换后验证排序和筛选下的行键、行号、嵌套操作及键盘选择；业务调用和测试均使用包资源后，再移除本地 `DataGrid.razor`、`.razor.css`、`.razor.js` 及 `DataGridRowEvent.cs`。

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

卡片使用公共库的隔离样式，无需 JS 或 DI 服务。可在宿主上设置 `--content-card-accent`、`--content-card-muted`、`--content-card-border`。传入 `bi-*` 图标时由宿主加载 Bootstrap Icons。`Title`、`Brand`、`Description`、`Icon` 均可省略；默认没有认证图标或品牌。正文通过 `ChildContent` 提供，可选页脚通过 `FooterContent` 提供，适合普通内容、设置、状态摘要或表单。

`Width` 和 `MaxWidth` 默认均为 `100%`，同时受父容器宽度限制；可使用 `MaxWidth="480px"` 限制表单宽度。`Centered` 默认 `false`，设为 `true` 时启用居中和页面外侧间距。标题默认是 h2，`HeadingLevel` 支持 1～6（越界钳制）；每个有标题的实例生成独立、稳定的标题 ID 与 `aria-labelledby`，无标题时不输出空标题。`Class` 和附加 HTML 属性用于卡片 section，子内容字段 ID 由调用方保证唯一。

可选表单样式使用 `card-form`、`card-fields`、`card-actions`、`card-note`、`card-feedback`、`card-password` 等类；普通内容不需要这些类，卡片不会给任意嵌套表单强加认证布局。

```razor
<ContentCard Title="任务摘要" Icon="bi-list-check">
    <ChildContent><p>这里可以展示任意页面内容。</p></ChildContent>
    <FooterContent><a href="/tasks">查看全部任务</a></FooterContent>
</ContentCard>
```

从旧 `AuthFormCard` 迁移时，将调用改为库中的 `ContentCard`，移除旧组件和旧隔离样式，将内容中的 `auth-*` 表单样式类改为对应的 `card-*`。需要维持原认证页外观时显式设置 `Centered="true" MaxWidth="480px" HeadingLevel="1"`，并传入原图标、品牌和文案；登录、注册逻辑继续由页面维护。更新宿主隔离样式缓存，不保留旧组件包装层。

卡片没有认证、提交或请求逻辑。简单错误提示继续使用已有 `<AlertComponent Message="..." />`。

## 生命周期与验证入口

`/backend/components-demo` 主区提供确认与选择、两种日期绑定、通用下拉选择、多级菜单、枚举／时间表单、逻辑目录和可交互的数据表格，最后展示简洁的全宽 `ContentCard` 及页脚。下拉选择和菜单的方向／对齐参数与触发按钮分行排列，菜单另可切换固定／自适应宽度。

示例导航使用相对应用基路径的 `backend/components-demo#input-heading` 等地址，保留当前页面路径；有 `<base href="/">` 的宿主中，单独的 `#input-heading` 会解析到站点首页，不能用于这里的页内跳转。

页尾“更多交互示例”默认折叠。展开后可验证确认框延迟移除／重挂与第二实例、异步日期失败重试、日期模式切换，以及日期输入不会提交外层表单。“内容卡片与表单组合”包含最大宽度 480px 的居中资料表单和省略品牌、图标及描述的简洁卡片；预览资料只更新页面提示，折叠／重新展开保留当前输入。页面只有一个 h1，分组使用 h2，组内卡片通过 `HeadingLevel="3"` 使用 h3。

维护时检查亮／暗／自动主题、窄屏、键盘、增强导航返回、多实例和组件移除；浮层还需检查卡片外区域、相邻卡片遮挡、内外层滚动与窗口缩放。确认／日期依赖原生 `<dialog>`，枚举／目录依赖 Popover API；浮层表面使用实色，遮罩可保持半透明。实际浏览器行为需在目标环境验证，不能仅由构建或脚本测试推断。

这些组件不提供身份认证、权限、数据持久化、文件系统访问、后端请求或领域业务规则。主题、布局和通用输入保持独立，业务能力由调用页面与服务提供。文件使用 UTF-8 BOM 与 CRLF。
