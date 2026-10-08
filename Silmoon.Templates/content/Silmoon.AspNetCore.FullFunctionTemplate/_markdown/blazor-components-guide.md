# 通用 Blazor 控件

本模板的通用控件位于 `Components/`，命名空间为 `Silmoon.AspNetCore.FullFunctionTemplate.Components`。可交互示例位于 `RazorPages/Backend/ComponentsDemo.razor`，路径为 `/backend/components-demo`。示例仅维护内存中的页面状态，不读取数据库或调用业务接口。

## 接入条件

- 使用模板现有的 Interactive Server 注册，在交互式页面中放置控件；静态 SSR 本身不会执行 Blazor 事件和 JS 生命周期。`AuthFormCard` 只提供外观，可以用于静态内容。
- 不需要新增 DI 服务。确认框、日期范围、枚举和目录控件会在交互阶段加载自己的同名 `.razor.js`，移除时释放监听或取消等待。
- 保留 `Components/App.razor` 引用的应用隔离样式 bundle、Bootstrap 和 Bootstrap Icons。复制组件时也要携带同名 `.razor.css`、`.razor.js` 及所用值类型；枚举和目录选择器还依赖 `wwwroot/js/picker-popover.js`，不能只复制 `.razor`。
- 控件使用现代颜色布局的 CSS 变量。按 [Blazor 布局指南](modern-color-layout-blazor-agent-guide.md) 加载主题；换用其他布局时提供相应的文字、背景、边框、焦点和 `--control-color-scheme` 变量。业务样式放在独立文件，勿改共享主题核心来适配单页。
- `EnumSelect` 和 `TimeInput` 继承 `InputBase<T>`，支持 `EditForm`、`ValidationMessage`、附加 HTML 属性及 `@bind-Value`。示例将它们放在 `EditForm` 中。

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

模板的 `App.razor` 放置全局 `Id="site-confirm-dialog-template"` 模板并加载同源脚本。普通浏览器 JS 可继续调用：

```javascript
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
- 快捷项在两种模式下都生成完整日期范围；周一是周起点，近三天包含今天，本周／本月截止今天结束，月跨度会将月末夹到目标月最后一天。
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
await import("/Components/DateTimeRangePicker.razor.js?v=3");
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

## AuthFormCard：可组合的表单外观

```razor
<AuthFormCard Title="个人资料" Brand="我的应用" Description="更新页面显示名称。" Icon="bi-person-circle">
    <div class="auth-form">
        <label class="form-label" for="profile-name">显示名称</label>
        <input id="profile-name" class="form-control" />
        <div class="auth-actions">
            <button type="button" class="btn btn-primary">保存</button>
        </div>
    </div>
</AuthFormCard>
```

`Title` 必填；`Brand`、`Description` 可空，空白时不渲染；`Icon` 默认 `bi-person-circle`；内容通过 `ChildContent` 提供。每个实例自动生成唯一标题 ID，同页可放多张卡片。可使用 `auth-form`、`auth-fields`、`auth-actions`、`auth-note`、`auth-feedback` 等类复用隔离样式。

卡片没有认证、提交或请求逻辑；`ChildContent` 内的字段 ID 仍由宿主保证唯一。简单错误提示继续使用已有 `<AlertComponent Message="..." />`。

## 生命周期与验证入口

`/backend/components-demo` 同时提供两种日期绑定、表单验证、24 点、目录创建、确认两种操作和可空卡片描述。折叠区可验证确认框延迟移除／重挂、第二实例、异步日期失败一次后重试、日期模式切换，以及日期输入不会提交外层表单。

维护时检查亮／暗／自动主题、窄屏、键盘、增强导航返回、多实例和组件移除；浮层还需检查卡片外区域、相邻卡片遮挡、内外层滚动与窗口缩放。确认／日期依赖原生 `<dialog>`，枚举／目录依赖 Popover API；浮层表面使用实色，遮罩可保持半透明。实际浏览器行为需在目标环境验证，不能仅由构建或脚本测试推断。

这些组件不提供身份认证、权限、数据持久化、文件系统访问、后端请求或领域业务规则。主题、布局和通用输入保持独立，业务能力由调用页面与服务提供。文件使用 UTF-8 BOM 与 CRLF。
