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
- `DropdownMenu.test.cjs`：多层动画与快速反向、键盘、默认／末尾对齐、RTL、上下避让、Popover 顶层、长菜单滚动及键盘聚焦可见性、慢加载、视口与尺寸变化、禁用、关闭取消、卸载重挂及资源清理，共 29 项。
- `DropdownSelect.test.cjs`：多实例、真实链接、键盘、禁用、Popover 定位和延迟加载前已打开的菜单。
- `DateTimeRangePicker.test.cjs`：本地日历、UTC、夏令时、异步失败重试、多实例、模式重建与外层表单隔离。
- `PickerPopover.test.cjs`：顶层浮层定位、视口与滚动祖先限位、键盘、外部关闭、多实例、监听和资源释放。
- `ComponentContracts`：直接引用模板组件，验证动态禁用、枚举显示元数据、未声明值、表单订阅释放、下拉框绑定和 SSR 链接、多级菜单递归与分支优先级、禁用及回调、对齐／展开方向参数、组件模块 URL 与确认框导入顺序，以及时间输入的完整 `HH:mm` 和 `24:00` 边界；不增加 NuGet 依赖。

## 浏览器验证

运行 Web 项目并访问 `/backend/components-demo`，检查亮／暗／自动主题、窄屏、键盘、增强导航返回、多实例、组件移除与重新挂载。浏览器控制台和服务器日志应无非预期错误。

- 确认框与日期对话框使用实色表面，在卡片内调用时不应被裁切。
- 枚举和目录面板使用原生 Popover 顶层，仍由 Blazor 管理 DOM 与事件；卡片外的选项应可见、可点击，不能只检查边界矩形。公共定位脚本为 `wwwroot/js/picker-popover.js`。
- 在带裁切和滚动的容器中测试长目录；触发按钮滚出可见区域后应关闭面板，禁用、卸载后不能保留浮层或监听。
- 日期异步失败示例会刻意拒绝一次应用，应保留旧值、显示提示且可重试。在日期输入框按 Enter 不应提交外层表单。
- 时间输入应逐键输入 `10:30` 验证，不能只用一次性填入；未完成的 `10:3` 不应被提前改写为 `10:03`。
- 按需模块还需检查：无控件页面不下载脚本，首次增强导航或交互插入可加载，多实例只执行一次，无 Blazor 且无 `base` 标签的深路径 cshtml 也可打开下拉框。

Bootstrap 共享浮层样式在 `/ModernColorDemo` 检查：菜单背景不透底，长菜单可覆盖相邻卡片，关闭后卡片恢复裁切；modal、popover 的背景、文字和箭头需兼容模板所用 Bootstrap 版本。

## 模板包验证

打包只使用已跟踪及未忽略的包源文件建立干净临时副本。外层项目从物理目录收集内容，不能直接依赖 `.gitignore` 排除本地配置、密钥和构建产物。检查包清单包含所有组件、同名样式／脚本、`wwwroot/js/picker-popover.js` 和接入说明，且不含本地配置、DataProtection、证书、IDE 文件、依赖库、构建输出或临时回归页面。

将本地包安装到隔离模板缓存，用非默认名称生成项目，检查命名空间、隔离样式 bundle 和端口替换，再还原静态库、构建和运行测试。此流程只验证包内容，不发布 NuGet 包。

## 已验证范围与限制

2026-10-09 已完成模板构建、Node 回归、实际 C# 组件回归及隔离包生成检查；浏览器覆盖桌面 Chrome、390×844 视口、亮色、暗色与当前系统暗色对应的自动模式。额外临时页面验证过 80 项目录、滚动祖先、相邻卡片、禁用、移除重挂和键盘操作，未加入模板包。

2026-10-28 补充验证通用下拉框及组件模块封装：97 项 Node 回归、8 项 C# 契约检查通过，模板项目随契约项目构建成功。Chrome 临时无业务宿主验证了无控件入口首次增强导航到 SSR／交互页面、无 Blazor 且无 `base` 的深路径 cshtml、真实链接菜单、交互选择回调、确认／第二操作。该轮未重新打包模板。

未模拟自动模式随系统亮色的分支，未验证其他浏览器或真实移动设备。本组示例只使用页面内存状态，不涉及数据库或交易业务。

2026-10-28 上一轮吸收通用 `DropdownMenu`（模块 v2）：105 项 Node 回归和 10 项 C# 契约通过。独立模板缓存生成非默认名 `MenuContractSample`，LibMan 恢复、Web 构建、命名空间／模块路径／隔离样式检查及生成副本 105 项 Node 回归通过，未打包发布。该轮 Chrome 临时无业务宿主验证到四层菜单和普通叶子回调；随后 Windows 浏览器自动化因无法可靠识别当前 URL 停止，动画时序、Primary 高亮恢复、快速进退最终状态、多实例、卸载重挂、减少动态效果及主题的该轮浏览器验收未完成，不以 Node 结果代替这些实测。该轮临时服务已关闭。

2026-10-28 本轮定位与遮挡修复（模块 v3）：完整 Node 回归 126/126、C# 契约 10/10 通过，示例页新增的 bool 选择控件也已编译通过。Chrome 无业务宿主实际验证了上下／左右四种组合、相邻卡片 `z-index: 30` 与输入框 `z-index: 5000` 覆盖区域的菜单命中和叶子回调，以及 `overflow: hidden` 加 `transform` 容器外两项均可点击。桌面与 390×844 视口的边缘自动避让、亮／暗／仅 Bootstrap 的实色表面、打开第二实例关闭第一实例、卸载后无残留且重挂回调不重复、动态禁用关闭均通过。长根菜单 End 可滚动显示第 24 项，Home 回到第 1 项；右方向键进入 30 项子菜单后，End 可滚动显示末项，Escape 关闭后无残留顶层菜单。增强导航进入 SSR 后，多层真实链接已到达 `/linked?source=static#target`，控制台无警告或错误。

本轮未实测动画精确时序、Primary 高亮恢复时序、快速进退动画最终状态、减少动态效果及其他浏览器，不以自动测试代替这些浏览器验收。上面的非默认名生成验证属于 v2 轮次，本轮未重新打包发布。

本轮 v3 已同步 10 个接收项目及 Trading。Portal、AppHub、API、AspNetCore.Test、Cloudflare.WebTesting、Data.BlazorAppTest 构建通过；TransactionHostServer、Huobao 仍受原有 NU1605 包降级限制，AspNetCore.Blockchain、Url 仍受原有 net9/net10 的 NU1201 限制。10 个接收项目的四个菜单文件与模板归一化一致，命名空间及 Url 的 RazorComponents 路径按项目适配。Trading 保留业务菜单末尾对齐，29 项菜单测试通过，隔离构建 0 错误、226 条既有上游警告。代码同步不等同于各仓已提交、NuGet 发布或应用部署。
