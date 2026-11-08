# Blazor 通用控件回归

从仓库根目录运行：

```powershell
dotnet restore Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/Silmoon.AspNetCore.FullFunctionTemplate.csproj
node --test tests/BlazorComponents/*.test.cjs
dotnet run --project tests/BlazorComponents/ComponentContracts/ComponentContracts.csproj
dotnet build Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/Silmoon.AspNetCore.FullFunctionTemplate.csproj
```

Node 脚本根据模板的 `obj/project.assets.json`，从实际还原的 NuGet 包读取组件脚本和共享定位脚本。使用独立构建目录时，可设置 `SILMOON_BLAZOR_COMPONENTS_ROOT` 指向该包的 `staticwebassets/Components`；与库源码对照时可显式指向源码的 `Components`。

## 自动验证范围

Node 测试直接加载实际组件 JavaScript，使用内置测试工具与模拟 DOM，不需要 npm 包。

`DataGrid.test.cjs` 在本机 Chromium 中加载公共库的 ES 模块，验证等待 Blazor 排序期间的行号和键盘顺序、嵌套控件、JS 管理行以及禁用时的焦点。可用 `CHROME_PATH` 指定浏览器路径，找不到浏览器时该项会显示为跳过。

- `ConfirmDialog.test.cjs`：确认／取消／第二操作、单活动实例、独立模板与 ARIA、拖动、卸载及重复加载。
- `DropdownMenu.test.cjs`：多层动画与快速反向、键盘、默认／末尾对齐、RTL、上下避让、Popover 顶层、长菜单滚动及键盘聚焦可见性、慢加载、视口与尺寸变化、禁用、关闭取消、卸载重挂及资源清理；另覆盖表面淡入淡出、中途反向、退场期间不可交互、快速重开恢复根层及表面／子层动画隔离，共 40 项。
- `DropdownSelect.test.cjs`：多实例、真实链接、值选择、键盘及焦点滚动、禁用、延迟加载、四方向／RTL／视口避让、超窄宽度限制、Popover 与原生 details 回退、180ms／140ms 淡入淡出、中途反向及过期回调、退出不可交互和卸载清理，共 28 项。
- `DateTimeRangePicker.test.cjs`：本地日历、UTC、夏令时、异步失败重试、多实例、模式重建与外层表单隔离。
- `PickerPopover.test.cjs`：顶层浮层定位、视口与滚动祖先限位、键盘、外部关闭、多实例、监听和资源释放。
- `ComponentContracts`：通过模板项目引用覆盖模板和公共库组件，包括动态禁用、枚举显示元数据、未声明值、表单订阅释放、下拉框绑定和 SSR 链接、多级菜单递归与分支优先级、禁用及回调、对齐／展开方向／宽度参数、组件模块 URL 与确认框导入顺序、ContentCard 可选标题／唯一标识／内容与页脚／宽度及居中参数、DataGrid 原始行对象／排序后坐标／SSR 表壳，以及时间输入的完整 `HH:mm` 和 `24:00` 边界；不增加 NuGet 依赖。

## 浏览器验证

运行 Web 项目并访问 `/backend/components-demo`，检查亮／暗／自动主题、窄屏、键盘、增强导航返回、多实例、组件移除与重新挂载。浏览器控制台和服务器日志应无非预期错误。

主区保留常用控件和全宽内容卡片；下拉选择与菜单的参数单独成行。展开页尾“更多交互示例”后，再检查确认框生命周期、异步日期和“内容卡片与表单组合”：居中资料表单的预览结果应随输入更新，折叠／重开应保留状态，多个卡片标题标识独立。默认折叠时资料表单不可见，桌面与窄屏均不应产生横向溢出。

- 确认框与日期对话框使用实色表面，在卡片内调用时不应被裁切。
- 枚举和目录面板使用原生 Popover 顶层，仍由 Blazor 管理 DOM 与事件；卡片外的选项应可见、可点击，不能只检查边界矩形。公共定位脚本由类库的 `wwwroot/js/picker-popover.js` 提供。
- 在带裁切和滚动的容器中测试长目录；触发按钮滚出可见区域后应关闭面板，禁用、卸载后不能保留浮层或监听。
- 日期异步失败示例会刻意拒绝一次应用，应保留旧值、显示提示且可重试。在日期输入框按 Enter 不应提交外层表单。
- 时间输入应逐键输入 `10:30` 验证，不能只用一次性填入；未完成的 `10:3` 不应被提前改写为 `10:03`。
- 按需模块还需检查：无控件页面不下载脚本，首次增强导航或交互插入可加载，多实例只执行一次，无 Blazor 且无 `base` 标签的深路径 cshtml 也可打开下拉框。

Bootstrap 共享浮层样式在 `/ModernColorDemo` 检查：菜单背景不透底，长菜单可覆盖相邻卡片，关闭后卡片恢复裁切；modal、popover 的背景、文字和箭头需兼容模板所用 Bootstrap 版本。

## 模板包验证

从实际开发目录打包到独立临时目录，核对归档中 `content/` 的路径与预期模板源文件逐一相符。外层项目通过 `<Content Include="content\**\*" />` 自动收录新目录和文件类型，后面的 `<Content Remove="..." />` 条目逐条排除指定路径。核对最终包中有模板描述、布局、示例、手册、LibMan 清单及本轮新增的模板资源，并确认归档中没有本机配置、Data Protection 密钥、IDE 文件、临时备份、构建输出和还原后的前端库。公共控件模块、隔离样式及 `js/picker-popover.js` 由上层依赖包提供。

将本地包安装到隔离模板缓存，用非默认名称生成项目，检查命名空间、隔离样式 bundle 和启动端口替换，并核对手册仍记载上游模板身份和原始示例端口。进入生成项目，执行 LibMan 还原，再构建和运行测试。

## 已验证范围与限制

### 公共控件 3.2.1（2026-11-08）

模板、Portal、AppHub、TransactionHostServer 和 TradingServer 均使用 NuGet.org 的 3.2.1 完成 Release 构建。模板通过 178 项组件及布局 JavaScript 测试和 13 项 C# 契约。新增的纽约夏令时回拨用例验证了直接确认时保留原始 UTC 端点、七位小数和标签，以及只改结束时间时保留原始起点。

使用模板的 Release 发布产物启动宿主后，`/backend/components-demo`、应用及公共控件隔离样式、Blazor 模块初始化入口均返回 HTTP 200。实际返回的日期 v6、表格 v2 和菜单 v5 脚本与还原包中的文件逐字节一致。Trading 的 WebTrade 模拟浏览器补齐了新版表格排序使用的 `Blob`，离线预览使用包内实际的互操作脚本文件名。

在 3.2.0 与 3.2.1 上分别复现了下列两个边界问题。

- 在 `America/Santiago` 的 2026-09-06 选择“上月”，结束日期会进入 9 月 1 日。日期模式多包含整天，时间模式多包含第一小时。
- 延迟 `EnumSelect` 或 `TreePicker` 首次模块导入，期间卸载组件再完成导入。两者均在卸载后调用一次 `initialize`，模块释放次数为零。

### 此前版本的验收记录

2026-11-08，Portal、AppHub、TransactionHostServer 均以 3.2.0 完成 Release 构建和发布目录验证。逐项解析三份发布产物的应用 `.styles.css` 及其 `@import`、Blazor `.modules.json` 指定的初始化模块、它导入的公共加载器、`DataGrid.razor.js` 和现代颜色资源，文件均存在。使用的包与 NuGet.org 的 3.2.0 对比，24 项包内容一致。模板另通过 177 项组件及布局 JS 测试和 13 项 C# 契约。适用范围见[模板接入指南](../../Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/_markdown/blazor-components-guide.md)。

同日核对 Trading 工作树，持仓、历史和对平选单均已引用公共表格，原有四个 DataGrid 文件已删除。Trading 主任务报告解决方案及测试宿主 Release 构建均为 0 警告、0 错误，662 项 Node 测试全部通过。Chrome 在桌面、390px 窄屏及明暗主题下使用模拟交易数据验证了刷新、嵌套按钮、键盘操作、排序后行列号和离页重挂。交易侧复测步骤见 Trading 仓库的 `HubAccountBroadcastHarness/README.md`。

Portal 和 AppHub 使用实际 Release 依赖离线验证了登录、退出、角色和 BSON 状态值，未连接业务数据库。Portal 的历史 `users.Status = -2` 在新依赖中由封禁改为暂停，部署前需按该项目 README 核对历史数据。两者均保留既有 `System.Security.Cryptography.Pkcs` 9.0.13 的 NU1902/NU1903 警告。TransactionHostServer 另以生产环境模式在本机验证演示页、受保护端点、登录退出和图像往返；发布的 12 个 Silmoon 程序集均可加载。

2026-11-08 在使用 NuGet `Silmoon.AspNetCore.Blazor 3.2.0` 的现代颜色模板 Release 发布页面，用 Chromium 在桌面、390px 窄屏各验收亮色和暗色。155 项 JS 回归（含 Chromium 表格测试）和 13 项 C# 契约通过。模板默认页面展示 Blazor 管理的数据行，JS 管理行在使用同一模板布局和正式包的独立验收页验证。

| 控件 | 已验证的行为 | 3.2.0 结果 |
| --- | --- | --- |
| `DataGrid<TItem>` | 两种模式的三态排序、筛选与清空、选择、单双击行列号、键盘激活、嵌套按钮、离页返回；JS 刷新数据后保持选中键和行内焦点 | 48 组交互及两组窄屏长表检查通过。100 行宽表只在表内横滚，纵滚后表头可见，点击第 80 行返回零基行号 79 |
| `DropdownMenu` | 四种弹出方向、视口翻转、固定及自适应宽度、淡入淡出、多级菜单回调、键盘跳过禁用项 | 通过；强制裁切父卡片后，卡片外仍可点击 |
| `DropdownSelect<TValue>` | 四种方向、进退动画、禁用项、选择与真实链接、增强导航后重新操作 | 通过；退出动画期间面板不可交互 |
| `ConfirmDialog` | 确认、取消、第三选项、独立实例；打开时从系统亮色切到暗色 | 通过；切换主题后仍能返回确认结果 |
| `ContentCard` | 标题层级、正文与页脚、全宽卡片和居中表单、折叠后保留输入 | 通过；居中表单在手机上随可用宽度收窄 |
| `TimeInput` | 常规时间、允许及禁止 `24:00`、非法输入保留旧绑定值、改正后提交 | 通过 |
| `EnumSelect<TEnum>` | 元数据、禁用、键盘选择和回焦、裁切卡片外点选 | 常规交互通过；首次导入模块期间卸载的缺陷见下 |
| `TreePicker` | 目录展开、选择、新建、非法名称、Escape 回焦、裁切卡片外点选 | 常规交互通过；有相同的卸载缺陷 |
| `DateTimeRangePicker` | 跨月近 30 天、毫秒值、逆序校验、取消和清空、异步失败后重试、外层表单隔离 | 常规交互通过；午夜跳时日的“上月”有误 |

在模板的 Release 发布产物中切换系统主题，表头和打开的确认框同步变色，表格选中项保持不变。筛选提示采用主题次级文字后，明暗模式下与输入背景的对比度分别为 5.94:1 和 5.40:1。启用“减少动态效果”后打开菜单，没有运行中的动画。

纯静态 `_BlankLayout` 的浏览器验证还覆盖了旧式 JS 调用：`DropdownSelect.bind` 切换语言与文字方向，用户更改只产生一次 `change`；`SiteDialogs.confirm` 通过指定模板返回确认或取消；`DateTimeRangePicker` 支持自定义文字、程序设值、一次应用回调和销毁后解绑。该页未加载 Blazor 运行时。

2026-11-08 九个通用控件接入公共库后的回归通过 155 项 JavaScript 测试和 13 项 C# 契约。近 30 天按钮的顺序和本地化文字改由 C# 契约检查实际渲染结果。Chrome 在独立 Blazor 子路径上验证表单校验、弹层、两种行管理模式和确认框。纯静态 Razor Pages 初始不渲染控件时不会请求对应模块，插入控件后每个模块加载一次。真实模板的 Release 发布产物使用 Blazor 自动发现的带指纹入口以及 cshtml 的固定 `js/component-modules.js`，两条路径均已验证。

2026-11-08 类库试迁通过 12 项 C# 契约。Chrome 对比了模板中三种卡片在 1440px、390px 和明暗主题下的尺寸、颜色及悬停样式，12 组结果一致。相同模板页面的数据表格通过排序、选行、筛选及空结果验证。独立 Blazor 宿主仅加载库样式，在 `/nested/` 下按需加载表格模块并完成行回调和两种行管理方式的切换。另用本地类库试验包替换临时模板里的项目引用，在相邻仓库之外生成并构建了不同名称的项目。

2026-10-09 已完成模板构建、Node 回归、实际 C# 组件回归及隔离包生成检查；浏览器覆盖桌面 Chrome、390×844 视口、亮色、暗色与当前系统暗色对应的自动模式。额外临时页面验证过 80 项目录、滚动祖先、相邻卡片、禁用、移除重挂和键盘操作，未加入模板包。

2026-10-28 补充验证通用下拉框及组件模块封装：97 项 Node 回归、8 项 C# 契约检查通过，模板项目随契约项目构建成功。Chrome 临时无业务宿主验证了无控件入口首次增强导航到 SSR／交互页面、无 Blazor 且无 `base` 的深路径 cshtml、真实链接菜单、交互选择回调、确认／第二操作。该轮未重新打包模板。

未模拟自动模式随系统亮色的分支，未验证其他浏览器或真实移动设备。本组示例只使用页面内存状态，不涉及数据库或交易业务。

2026-10-28 上一轮吸收通用 `DropdownMenu`（模块 v2）：105 项 Node 回归和 10 项 C# 契约通过。独立模板缓存生成非默认名 `MenuContractSample`，LibMan 恢复、Web 构建、命名空间／模块路径／隔离样式检查及生成副本 105 项 Node 回归通过，未打包发布。该轮 Chrome 临时无业务宿主验证到四层菜单和普通叶子回调；随后 Windows 浏览器自动化因无法可靠识别当前 URL 停止，动画时序、Primary 高亮恢复、快速进退最终状态、多实例、卸载重挂、减少动态效果及主题的该轮浏览器验收未完成，不以 Node 结果代替这些实测。该轮临时服务已关闭。

2026-10-28 本轮定位与遮挡修复（模块 v3）：完整 Node 回归 126/126、C# 契约 10/10 通过，示例页新增的 bool 选择控件也已编译通过。Chrome 无业务宿主实际验证了上下／左右四种组合、相邻卡片 `z-index: 30` 与输入框 `z-index: 5000` 覆盖区域的菜单命中和叶子回调，以及 `overflow: hidden` 加 `transform` 容器外两项均可点击。桌面与 390×844 视口的边缘自动避让、亮／暗／仅 Bootstrap 的实色表面、打开第二实例关闭第一实例、卸载后无残留且重挂回调不重复、动态禁用关闭均通过。长根菜单 End 可滚动显示第 24 项，Home 回到第 1 项；右方向键进入 30 项子菜单后，End 可滚动显示末项，Escape 关闭后无残留顶层菜单。增强导航进入 SSR 后，多层真实链接已到达 `/linked?source=static#target`，控制台无警告或错误。

v3 轮次未实测动画精确时序、Primary 高亮恢复时序、快速进退动画最终状态、减少动态效果及其他浏览器，不以自动测试代替这些浏览器验收。上面的非默认名生成验证属于 v2 轮次，v3 轮次未重新打包发布。

v3 修复已同步 10 个接收项目及 Trading。Portal、AppHub、API、AspNetCore.Test、Cloudflare.WebTesting、Data.BlazorAppTest 构建通过；TransactionHostServer、Huobao 仍受原有 NU1605 包降级限制，AspNetCore.Blockchain、Url 仍受原有 net9/net10 的 NU1201 限制。10 个接收项目的四个菜单文件与当轮模板归一化一致，命名空间及 Url 的 RazorComponents 路径按项目适配。Trading 保留业务菜单末尾对齐，29 项菜单测试通过，隔离构建 0 错误、226 条既有上游警告。代码同步不等同于各仓已提交、NuGet 发布或应用部署。

2026-10-28 v4 模板验证：完整 Node 回归 137/137、C# 契约 10/10 通过，内层 Web 项目随契约构建成功。新增自动验证覆盖 180ms 淡入／140ms 淡出的配置、逻辑关闭后保留不可交互的退场表面、中途关闭或重开时透明度连续、快速重开恢复根层、过期动画完成不影响新状态、禁用／卸载清理、减少动态效果与普通定位回退。实际 Razor 渲染验证 `MenuWidth` 默认 `12.5rem`（16px 根字体下为 200px）、`auto` 映射内容宽度、自定义 CSS 长度与空白回退；新增等宽参数切换时 Blazor 替换 inline style 后，下一帧仍恢复定位的回归。以上先在模板预览完成，再按用户要求同步至全部 Blazor Web 接收项目；接收项目的验证结果单独记录。

v4 的 Chrome 无业务预览已实测：默认宽度 200px，`auto` 下短文本／长文本／子层宽度分别为 139px／285px／252px，`22rem` 固定宽度为 352px。320px 窄视口的实际可用宽度为 312px 时，菜单被限为 296px，左右各留 8px；200px 固定宽度的长文本正常换行，无横向溢出。逐帧诊断观测到淡入透明度 `0 → .179 → .34 → 1`，淡出 `1 → .967 → .226 → .002` 后顶层及 `is-closing` 状态清理，退场期间 `inert=true`。本轮新增表面淡入淡出已进行真实浏览器验证；子层动画精确时序等既有历史限制仍保留，原生减少动态效果及其他浏览器未重新实测。本机 64528 端口的预览保留供本轮效果审阅。

2026-10-28 下拉选择框对齐与动画（`DropdownSelect` 模块 v3）：完整 Node 回归 155/155、C# 契约 11/11 通过，真实模板 Web 项目随契约构建成功。Select 的 28 项 Node 测试保留值选择、原生链接及禁用行为，并覆盖 `AlignEnd`／`OpenUpward` 四种组合、RTL、上下翻转、视口宽高限位（含 160px 可见宽度下 144px 菜单）、窗口与可见视口变化、长列表聚焦内部滚动，以及 180ms 淡入／140ms 淡出、快速反向、过期动画、禁用／卸载、减少动态效果和无 Popover 回退。C# 验证四种方向参数、SSR 真实链接、禁用链接替换及 v3 绝对模块 URL。原生 `details` 关闭后，退场期间依赖 `::details-content` 保持内容可见；不支持该选择器时直接清理。Node 只验证条件分支与清理契约，不替代此浏览器渲染行为的实际验收。

本轮 Select Chrome 实测通过四种方向组合，左右对齐误差为 0、上下间隔为 8px；真实值选择更新为 cards、摘要显示“卡片”，回调一次。逐帧观测淡入 `0 → .178 → .34 → .489 → .624 → .742 → .845 → .925 → .98 → 1`，淡出经过 `1 → .967 → .881 → .758 → .605 → .427`；关闭期间 `details.open=false`，浮层仍有 160×153.6px 尺寸且保持 Popover，`inert=true`、命中测试不可交互，结束后清理。35ms 内快速重开后保持打开且无 closing／inert 残留，动态禁用关闭、打开后卸载无残留以及 390×844 视口可见性均通过。独立原生探针确认缺少 `::details-content` 规则会立即缩为 0×0，补上规则后可播放退场。非 Chrome／不支持该伪元素的即时回退与减少动态效果本轮只做自动测试，SSR／增强导航与 RTL 未在本轮重新进行浏览器实测。

同轮 `ContentCard` 通用容器契约已加入上述 11 项 C# 验证：无需认证品牌或标题，未设置内容时不输出空标题／悬空 `aria-labelledby`；标题默认 h2，多实例标题 ID 唯一，正文／页脚保持调用方内容与真实链接，支持自定义类、附加属性和宽度。显式 `Centered="true"`、`MaxWidth="480px"`、`HeadingLevel="1"` 及品牌／图标可保留原认证页外观参数；空白宽度回退与标题级别范围也已验证。真实模板构建包含最新示例页；这些渲染契约不代替最终 CSS 外观验收。

ContentCard 的 Chrome 实测通过：普通卡片占满 898px 宿主、无默认图标且页脚正常渲染；居中示例实际宽度 480px，左右间距各 209px。h2／h1 标题计算字号为 26.4px、margin 为 0，各标题 ID 唯一且无障碍引用正确；无标题卡片不输出 header 或标题引用。普通输入框高度 38px，只有 `.card-form` 内变为 44px，表单样式作用范围正确；本地示例提交回调一次。亮暗主题切换与 390×844 视口通过，窄屏三张卡片均为 320px 且无水平溢出。预览使用最终模板 Razor／CSS，隔离构建 0 警告、0 错误；未实测其他浏览器或读屏软件。

同日最终同步已完成：模板及通用控件指南列出的 11 个 Blazor Web 接收项目均使用 `DropdownMenu` v4、`DropdownSelect` v3 和 `ContentCard`。每个项目的菜单四文件、选择框四文件与卡片两文件在规范化命名空间、Url 的 `RazorComponents` 模块路径和换行后，共 120/120 文件一致；生产组件及调用中无旧 `AuthFormCard` 或临时 `Card` 类型引用。模板、Trading 和其他手工缓存宿主已更新隔离样式查询版本，Data 的 `@Assets` 和 Url 的 `asp-append-version` 保持原机制。

10 个非 Trading 接收项目上一批菜单测试 400/400、本批选择框测试 280/280 通过；Trading 本批菜单及选择框测试 68/68 通过。Portal、AppHub、API、AspNetCore.Test、Cloudflare.WebTesting、Data.BlazorAppTest 本批隔离构建成功；Trading 隔离构建 0 错误、226 条既有上游警告。TransactionHostServer、Huobao 的既有 NU1605 与 AspNetCore.Blockchain、Url 的既有 net9/net10 NU1201 限制仍在，未升级依赖或宣称它们完整构建通过。Trading 登录／注册只迁移卡片和样式类，业务代码未变；各仓原暂存区保持不变，本轮未提交或推送。以上浏览器实测来自使用最终模板文件的独立预览，并非所有接收项目的逐页浏览器验收。

2026-10-28 后续整理 `ComponentsDemo.razor`：居中资料表单移入默认折叠的“更多交互示例”，主区保留简洁内容卡片，下拉参数与操作按钮分行，组内卡片使用 h3。真实模板 Web 项目构建 0 警告、0 错误。将最终页面原样放入加载实际组件及现代颜色资源的独立宿主，在 Chrome 验证桌面和 390px 视口：默认折叠时资料表单不可见，展开后真实预览显示“你好，DemoUser。”，折叠重开保留输入与提示，均无横向溢出；方向／对齐参数、固定 320px 与 auto 菜单宽度实际生效。验收中发现单独片段链接受 `<base>` 影响跳到首页，四处链接已改为相对应用基路径的页面加片段地址；Select 到 `#input-heading`、Menu 到 `#folder-heading` 均留在示例页且目标可见。本轮只验证示例整理涉及的路径，未重新执行全部组件行为矩阵或模板打包。

示例整理后的跨项目复核：12 个实际启用的 Blazor Web 主宿主与同步清单完全对应，120 个共享组件文件仍一致，缓存与模块路径正确。11 个接收项目没有这份综合示例页或相应副本，故未增加演示路由；已更新 Trading 的通用控件手册及 AspNetCore、Cloudflare、Data 的现有 README，补充模板示例入口、默认折叠的组合用法和带页面路径的片段导航规则。接收项目本轮仅改文档，未重复构建；此前四项依赖构建限制仍适用。
