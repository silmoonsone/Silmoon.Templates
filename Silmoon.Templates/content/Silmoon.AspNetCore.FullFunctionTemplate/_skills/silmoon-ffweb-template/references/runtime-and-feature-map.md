# ffweb 运行时与内置能力映射

只在任务涉及宿主、服务、认证、数据库、上传、SignalR、页面/组件或它们之间的联动时读取本文。这里记录模板如何接线，不代替 Silmoon 库 API 文档。

以下以当前模板内容根为 `<app-root>`。本参考文件随技能位于 `<app-root>/_skills/silmoon-ffweb-template/`；在模板源码仓库中，`<app-root>` 通常是 `Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/`，在生成项目中就是 Web 项目根。生成项目可能已经演进，所有状态仍须用目标代码确认。

## 状态分类

- **默认启用**：当前 `Program.cs` 已注册并映射，且对应文件参与编译。
- **预置未启用**：存在注释块、示例类型或前端页面，但注册、映射、依赖或编译项没有全部接通。
- **demo/scaffold**：代码可能参与编译和运行，但只演示调用形态，不提供生产持久化、安全、授权、容量或分布式保证。

## 启动链与宿主管线

当前 `Program.cs` 的关键顺序如下；修改前从目标文件重新确认：

1. 从入口程序集取得 `ProjectName`，随后调用 `Configure.InitialTypeRegister()`。
2. 创建 builder，并把 Host shutdown timeout 设为 3 秒。
3. 注册 Razor Pages、MVC、Razor Components Interactive Server、认证/Session、Silmoon 服务、配置服务和 `Core`。
4. build 后配置异常处理、HTTPS、Antiforgery、静态文件、Session、SilmoonAuth、Authentication 与 Authorization。
5. 映射 Razor Pages、MVC conventional routes 和 Razor Components，随后运行应用。

当前默认 DI/宿主映射：

| 能力 | 当前接线 | 主要文件 | 修改时同步检查 |
|---|---|---|---|
| Razor Pages | `AddRazorPages()` + `MapRazorPages()` | `Pages/` | `_ViewImports.cshtml`、`_ViewStart.cshtml`、Shared layouts、路由冲突 |
| MVC | `AddMvc(...).AddNewtonsoftJson()` + controller routes | `Controllers/`、`Views/` | binder 顺序、View imports/layout、conventional route |
| Blazor | `AddRazorComponents().AddInteractiveServerComponents()` + interactive server render mode | `Components/`、`RazorPages/` | `App.razor`、`Routes.razor`、render mode、JS interop |
| Silmoon 认证 | Cookie handler、`AddSilmoonAuth<SilmoonAuthServiceImpl>()`、`UseSilmoonAuth()` | `Program.cs`、`Services/SilmoonAuthServiceImpl.cs` | Session/cache、Cookie、登录页面、`[Authorize]`、退出入口 |
| 配置与 MongoDB | `AddSilmoonConfigure<SilmoonConfigureServiceImpl>()`、singleton `Core` | `Configure.cs`、`Core.cs`、配置服务、`config*.json` | 编译配置、工作目录、连接串、DI 生命周期 |
| JS interop | `AddJsComponentInterop()`、`AddJsSilmoonAuthInterop()` | `Program.cs`、交互组件、`Components/App.razor` | 只在交互阶段调用、RCL 静态资产和前端脚本 |

`app.UseSilmoonAuth()` 当前位于 `UseSession()` 之后、`UseAuthentication()` 之前。不要只根据通常的 ASP.NET Core 管线习惯重排；先用目标包行为和相关认证流程证明必要性。

`Program.cs` 映射了两个同名的 `default` controller route，并且 MVC `Home/Index`、`Pages/Index.cshtml` 与 Blazor `RazorPages/Home.razor` 都提供根路径候选；`/Error` 也同时出现在 cshtml 与 Blazor。触及路由时要枚举当前端点并实际请求目标 URL，不能仅凭目录名判断最终归属。

当前 CORS 调用使用 Silmoon `WithHosts("localhost")` 扩展。Host 过滤不等于标准 `WithOrigins` allowlist，不要把它描述为已开放 localhost 跨域；以目标扩展实现和请求测试确认。

## 全局类型与序列化注册

`Configure.InitialTypeRegister()` 当前负责：

- 为 MongoDB `ObjectId` 添加 type converter。
- 注册 Decimal128、BigInteger、`JObject` 与 `JArray` 的 BSON serializer/converter。
- 注册一个非常宽松的 `ObjectSerializer` 允许类型谓词。
- 设置进程级 `JsonConvert.DefaultSettings`，加入 common/BSON converters，并启用 `TypeNameHandling.Auto` 与 simple assembly format。

这些都是进程级行为，不是局部 helper。重复注册可能抛异常或改变全局契约；移动到请求路径会重复执行。当前允许类型谓词和 `TypeNameHandling.Auto` 都具有明显安全边界：兼容性任务不要静默删除，面向不可信 JSON 或新生产设计也不要未经威胁评估原样沿用。

MVC 还把 `BigIntegerBinderProvider`、`ObjectIdBinderProvider`、`JObjectBinderProvider`、`JArrayBinderProvider` 依次插到 provider 列表索引 0。因为每次都插入 0，最终优先顺序与代码书写顺序相反；调整时以目标运行列表为准。

## 配置、工作目录与生命周期

模板在 `#if DEBUG` 分支调用 `DebugConfig()`，其他编译配置调用 `ReleaseConfig()`。这由编译符号决定，不跟随 `ASPNETCORE_ENVIRONMENT` 自动切换。

- `config.json` 与 `config.debug.json` 是默认示例文件。
- `config.local.json` 与 `config.local.debug.json` 用于本地覆盖，匹配 `.gitignore`，项目文件设置为输出目录 PreserveNewest 且发布目录 Never。
- `SilmoonConfigureServiceImpl` 从一次性加载的 `ConfigJson` 读取 `mongodb`，并记录实际配置文件路径；相对路径依赖进程工作目录。
- 本地配置的选择优先级、无 reload 行为和确切文件名来自当前 Silmoon 配置服务版本；需要改变时用目标还原资产或 `$silmoon-aspnetcore`/`$silmoon-dotnet` 核对。

不要把示例 MongoDB URI 当作可用凭据。敏感值应由目标项目已经选择的秘密管理方式提供。

`Core` 当前注册为 singleton，继承 `MongoService`，在构造时用配置连接串创建 `MongoExecuter`。它把 `ISilmoonConfigureService` 强制转换为模板具体实现。改变配置服务实现或 DI 生命周期时要同步调整此契约；不要向 singleton `Core` 或其 singleton 消费者直接捕获 scoped 服务。

`Core.GetUser()` 和 `NewUser()` 是假数据/结果样例，并不访问 MongoDB。修改用户系统时不要只替换 UI；要同时定义持久化、唯一性、密码、错误模型和调用方契约。

## 认证、Session 与 Data Protection

当前 Cookie 和 Session 名称都以运行程序集 `ProjectName` 为前缀；模板生成后的项目名因此会影响 Cookie 隔离。Cookie 登录路径是 `/SignIn`，拒绝路径是 `/access_denied`。

模板调用 `AddSession()`，但 `Program.cs` 没有显式注册 `IDistributedCache` backing store。不要宣称 Session 已可用或可分布式部署；检查目标依赖是否另有注册，并按部署拓扑验证。多实例不能把进程内缓存称为共享 Session。

Data Protection keys 被写到进程当前目录下的 `DataProtection/`。这些 key 是运行状态，不是模板资产，不得进入仓库、日志或 `.nupkg`；改变工作目录、容器文件系统或多实例部署时要重新设计持久化与共享策略。

`SilmoonAuthServiceImpl` 当前通过 `Core.GetUser()` 返回用户，并用 MD5 处理密码；UserToken 重载返回默认值。MVC/cshtml 页面、Blazor `JsSilmoonAuthInterop` 与库提供的 session endpoint 是不同调用表面，修改认证时要分别验证。MD5、固定密码、未验证 return URL 和演示 User 对象都不是生产认证方案。

当前 `[Authorize]` 只出现在部分 Blazor 页面，例如 Dashboard 和 Upload；`Components/Routes.razor` 使用普通 `RouteView` 而非 `AuthorizeRouteView`。在核对目标框架和宿主行为并完成运行验证之前，不得把页面 attribute 视为已经形成有效保护。新增受保护的 Blazor 路由时，确认 router 使用 `AuthorizeRouteView` 或目标框架下等价的服务器端授权机制；若没有，则补齐路由/endpoint 保护，并始终在服务与数据层再次授权。至少验证匿名用户的冷启动直访、增强导航和绕过隐藏菜单后的直接访问。

`User.Role` 的存在不等于模板已经定义管理员集合、角色层级或 Claims 映射。实现 role/policy 前检查目标包中的实际枚举元数据、登录时如何生成 Claims/身份，以及目标项目把哪些角色定义为授权主体；不要从角色名称推断包含关系，也不要在菜单、页面和服务中各维护一套不同判断。

## 三种 UI 表面

目录命名是本模板最容易误判的地方：

| 目录 | 实际技术 | 默认布局/入口 |
|---|---|---|
| `Pages/` | cshtml Razor Pages | `Pages/_ViewStart.cshtml`、`Pages/Shared/*.cshtml` |
| `Views/` | MVC Views | `Views/_ViewStart.cshtml`，controller conventional route |
| `RazorPages/` | Blazor routable Razor components | `Components/Routes.razor`，目录 `_Imports.razor` 可覆盖 layout |
| `Components/` | Blazor 应用外壳、布局和复用组件 | `App.razor`、`Routes.razor`、`Layout/` |

需求只指“Razor 页面”时要从目标文件、路由和用户上下文判断究竟是 cshtml 还是 `.razor`，不要自行同时实现三份。

`Pages/Shared/_AppLayout.cshtml` 与 `_AppBlankLayout.cshtml` 预置了 `appReceiveCall`/`appInvoke` WebView 式桥接和浏览器 fallback，但并非默认全站布局。只有目标页面明确采用时才把它当契约。

## 上传示例

MVC 上传链由 `FileController`、`WebApiController`、`Views/File/`、`wwwroot/js/sm-upload.js` 和 `sm-upload.css` 组成。图片示例读取首个 form file，经方向修正、缩放和压缩后，把字节存入 `GlobalCaching`；普通文件同样存进进程内缓存。Blazor 的 `RazorPages/File.razor` 与 `Upload.razor` 则通过 `RazorComponentHelper.ReadInputFile` 在组件端展示读取进度。

这些路径是 demo/scaffold：

- 缓存不是持久化或分布式存储，进程退出会丢失。
- `UserId`、文件名、首个表单文件、扩展名 MIME 和文件大小/类型都需要真实校验。
- 当前端点和页面不能被推断为已完整授权、防重放、限流或防恶意图片。
- 某些 MVC 示例依赖的客户端库或参数名未必已经完整接通；当前上传 Views 使用 Vue，而默认 layout/`libman.json` 未接通 Vue，必须实际打开页面验证，不以编译成功代替端到端成功。

生产实现应先确定身份绑定、容量限制、内容检测、持久化、访问控制和清理策略，再决定保留哪些示例 helper。

## SignalR 两种预置模式

SignalR 默认未启用：`AddSignalR()`、Chat service 注册和两个 `MapHub` 都被注释。

- `ChatHub` 把逻辑直接放在 Hub 中。
- `ChatServiceHub` 把操作转发给 `ChatService`，需要匹配的 `ChatService` 生命周期和 DI 注册。
- `Views/Demo/SignalR.cshtml` 当前客户端连接 `/hubs/ChatHub`。

启用时选择一种与客户端路径一致的模式，并同时检查服务注册、Hub 映射、前端 SignalR 库、连接状态生命周期和并发语义。不要同时取消所有注释，也不要把示例内存连接表当作跨进程在线状态。

## 现代颜色布局

模板同时提供 cshtml 与 Blazor 两条实现，共用核心 CSS/JS，但宿主方式不同：

- cshtml：`Pages/Shared/_ModernColorLayout*.cshtml` + `Pages/ModernColorDemo.cshtml`。
- Blazor：`Components/Layout/ModernColor/*.razor` + `RazorPages/Backend/`。
- 公共核心：`wwwroot/css/modern-color-layout.css`、`wwwroot/js/modern-color-layout.js`。
- Blazor 适配：`ModernColorLayoutInitializer.razor`、`modern-color-layout-blazor.js` 和 `site.js` 中的 `ScriptLoader`。

当前是 `ModernColorLayout : LayoutComponentBase` 的单一 Blazor layout。模板指南中的 `UserLayout`、`AdminLayout`、`UserNavMenu` 等是扩展设计示例，不是当前已存在的文件。

具体 DOM、菜单、主题、局部导航和回归规则以模板内对应 `.markdown` 指南为唯一详细事实源；只读取当前表面的一份。不要把认证或业务 API 放进通用布局脚本。

## 其他预留功能

以下默认都不是已启用能力：Swagger、SignalR Newtonsoft protocol、WebAuthn、Turnstile、SilmoonDevApp、自定义 Hosted Service、API decrypt。接入前逐项确认：

1. 目标包和版本真实存在。
2. 注释中的占位类型、密钥、Host、路径和服务实现已被业务值替换。
3. DI、middleware 与 endpoint 三部分完整且顺序正确。
4. `SilmoonDevAppServiceImpl.cs` 等目标文件是否参与编译。
5. 对应安全边界已按 `$silmoon-aspnetcore` 或目标源码核对。

## 文件联动索引

| 任务 | 至少同步检查 |
|---|---|
| 认证/用户 | `Program.cs`、`SilmoonAuthServiceImpl.cs`、`Core.cs`、`Models/User.cs`、MVC/cshtml/Blazor 登录入口、菜单、`[Authorize]` 页面 |
| 配置/MongoDB | inner `.csproj`、`Program.cs`、`Configure.cs`、`SilmoonConfigureServiceImpl.cs`、`Core.cs`、`config*.json`、本地/发布规则 |
| MVC/Razor 路由 | `Program.cs`、controller/page route、三套根入口、对应 imports/start/layout |
| Blazor/render mode | `Program.cs`、`Components/App.razor`、`Routes.razor`、目标 `.razor`、JS interop 服务和静态资产 |
| 上传 | `FileController.cs`、`WebApiController.cs`、`Views/File/`、Blazor upload components、`sm-upload.js/css`、存储与授权 |
| SignalR | `Program.cs`、所选 Hub、`ChatService.cs`、`Views/Demo/SignalR.cshtml`、`libman.json` |
| 现代颜色布局 | 对应 cshtml 或 Blazor layout、共享 CSS/JS、initializer/adapter、对应 `.markdown` 指南 |

修改后只验证受影响的链，但至少包含 inner Web 项目构建和一个真实入口的针对性运行检查。
