# Blazor 通用控件回归

从仓库根目录运行：

```powershell
node --test tests/BlazorComponents/*.test.cjs
dotnet run --project tests/BlazorComponents/ComponentContracts/ComponentContracts.csproj
dotnet build Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/Silmoon.AspNetCore.FullFunctionTemplate.csproj
```

可通过 `--artifacts-path <临时目录>` 将 .NET 构建输出放在仓库外。验证生成项目时，将 `FFWEB_COMPONENTS_ROOT` 环境变量指向生成项目的 `Components` 目录，再执行同一组 Node 测试；结束后移除该变量。

## 自动验证范围

Node 测试直接加载实际组件 JavaScript，使用内置测试工具与模拟 DOM，不需要 npm 包。

- `ConfirmDialog.test.cjs`：确认／取消／第二操作、单活动实例、独立模板与 ARIA、拖动、卸载及重复加载。
- `DateTimeRangePicker.test.cjs`：本地日历、UTC、夏令时、异步失败重试、多实例、模式重建与外层表单隔离。
- `PickerPopover.test.cjs`：顶层浮层定位、视口与滚动祖先限位、键盘、外部关闭、多实例、监听和资源释放。
- `ComponentContracts`：直接引用模板组件，验证动态禁用、枚举显示元数据、未声明值、表单订阅释放，以及时间输入的完整 `HH:mm` 和 `24:00` 边界；不增加 NuGet 依赖。

## 浏览器验证

运行 Web 项目并访问 `/backend/components-demo`，检查亮／暗／自动主题、窄屏、键盘、增强导航返回、多实例、组件移除与重新挂载。浏览器控制台和服务器日志应无非预期错误。

- 确认框与日期对话框使用实色表面，在卡片内调用时不应被裁切。
- 枚举和目录面板使用原生 Popover 顶层，仍由 Blazor 管理 DOM 与事件；卡片外的选项应可见、可点击，不能只检查边界矩形。公共定位脚本为 `wwwroot/js/picker-popover.js`。
- 在带裁切和滚动的容器中测试长目录；触发按钮滚出可见区域后应关闭面板，禁用、卸载后不能保留浮层或监听。
- 日期异步失败示例会刻意拒绝一次应用，应保留旧值、显示提示且可重试。在日期输入框按 Enter 不应提交外层表单。
- 时间输入应逐键输入 `10:30` 验证，不能只用一次性填入；未完成的 `10:3` 不应被提前改写为 `10:03`。

Bootstrap 共享浮层样式在 `/ModernColorDemo` 检查：菜单背景不透底，长菜单可覆盖相邻卡片，关闭后卡片恢复裁切；modal、popover 的背景、文字和箭头需兼容模板所用 Bootstrap 版本。

## 模板包验证

打包只使用已跟踪及未忽略的包源文件建立干净临时副本。外层项目从物理目录收集内容，不能直接依赖 `.gitignore` 排除本地配置、密钥和构建产物。检查包清单包含所有组件、同名样式／脚本、`wwwroot/js/picker-popover.js` 和接入说明，且不含本地配置、DataProtection、证书、IDE 文件、依赖库、构建输出或临时回归页面。

将本地包安装到隔离模板缓存，用非默认名称生成项目，检查命名空间、隔离样式 bundle 和端口替换，再还原静态库、构建和运行测试。此流程只验证包内容，不发布 NuGet 包。

## 已验证范围与限制

2026-10-09 已完成模板构建、Node 回归、实际 C# 组件回归及隔离包生成检查；浏览器覆盖桌面 Chrome、390×844 视口、亮色、暗色与当前系统暗色对应的自动模式。额外临时页面验证过 80 项目录、滚动祖先、相邻卡片、禁用、移除重挂和键盘操作，未加入模板包。

未模拟自动模式随系统亮色的分支，未验证其他浏览器或真实移动设备。本组示例只使用页面内存状态，不涉及数据库或交易业务。
