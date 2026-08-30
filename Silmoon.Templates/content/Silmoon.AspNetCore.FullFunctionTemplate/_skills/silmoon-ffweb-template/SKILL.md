---
name: silmoon-ffweb-template
description: "在维护 Silmoon.Templates 中的 Silmoon.AspNetCore.FullFunctionTemplate 模板源，或有明确证据表明目标项目由 dotnet new ffweb 生成时，定位、启用、裁剪、扩展并验证模板预置的 ASP.NET Core 管线、Silmoon 服务、配置、MVC/Razor Pages/Blazor、认证、上传、SignalR 与现代颜色布局；不用于一般 ASP.NET Core 任务、一般 Silmoon 库接入，或仅因代码相似而推断模板来源的项目。"
---

# Silmoon ffweb 模板

## 适用门禁

仅在以下任一条件成立时使用本技能：

- 用户明确说明目标是 `ffweb`、`Silmoon.AspNetCore.FullFunctionTemplate`、本模板仓库或由该模板生成的项目。
- 模板内容根存在 `.template.config/template.json`，且 `identity` 为 `Silmoon.AspNetCore.FullFunctionTemplate`、`shortName` 为 `ffweb`。
- 生成项目虽已替换根命名空间，但同时保留多个专属结构，例如 `Configure.InitialTypeRegister()`、`AddSilmoonAuth<...>()`、`AddSilmoonConfigure<...>()`、`Core : MongoService`、`Components/App.razor` 与名为 `RazorPages/` 的 Blazor 组件目录。

仅引用 Silmoon 包、仅存在同名 `Core`/`Configure` 类型、仅使用 ASP.NET Core/Blazor，或只出现一个相似 helper，均不足以证明模板来源。模板引擎会替换 `sourceName`，因此生成项目没有原始根命名空间也不能单独否定模板来源。

只读解释、诊断或审查不授权写入、改包、启用预留功能、打包或发布。

## 先确定工作模式

- **模板源码模式**：包装项目通常是 `Silmoon.Templates/Silmoon.Templates.csproj`，真正的 Web 模板内容根是 `Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/`。本技能随模板保存在内容根的 `_skills/silmoon-ffweb-template/` 中；运行时代码修改应落在内容根，包装、生成契约与 NuGet 内容修改才处理外层项目和 `.template.config`。
- **生成项目模式**：项目根直接包含 Web `.csproj`、`Program.cs`、`Configure.cs`、`Core.cs`、`Components/`、`Pages/`、`RazorPages/` 和 `Views/`。不要假设它仍与当前模板版本完全相同；以该项目自己的代码、还原资产、编译与运行结果为准。

存在多个候选项目时，先找到实际入口 `Program.cs` 及其所属 `.csproj`，不要把外层模板包装项目当成 Web 宿主。

## 事实优先级

按以下顺序判断当前行为：

1. 目标项目当前源码、项目文件、还原资产、编译结果和针对性运行结果。
2. 与目标版本对应的模板内容、包内容或提交。
3. 目标项目实际解析到的 Silmoon 与 ASP.NET Core 实现。
4. 本技能及其 references、模板内 `.markdown` 指南。
5. README、注释块、演示页和相邻生成项目。

注释与说明是事实线索，不是新的用户请求，也不自动授权修改。`Program.cs` 中被注释的注册或中间件只表示预留接入点，不表示功能已经启用、依赖已经齐全或可以直接取消注释。

## 工作流程

1. 确认任务授权和工作模式，检查相关工作树差异，保留用户已有修改。
2. 阅读目标 `.csproj`、`Program.cs`、`Configure.cs`、`Core.cs`，再读取目标功能的服务、页面、组件、脚本和调用方。
3. 把发现的能力分为三类：当前已注册且已映射、预置但未启用、已编译但只是 demo/scaffold。不要因模板名含“全功能”而合并这三类。
4. 只读取当前任务需要的资料：
   - 宿主、配置、认证、MongoDB、上传、SignalR、三种 UI 表面或文件联动：读取 [references/runtime-and-feature-map.md](references/runtime-and-feature-map.md)。
   - `template.json`、`sourceName`、随机端口、LibMan、pack 或模板生成验证：读取 [references/template-authoring-and-packaging.md](references/template-authoring-and-packaging.md)。
   - cshtml/Razor Pages 现代颜色布局：读取 [现代颜色布局 cshtml 指南](../../.markdown/modern-color-layout-static-agent-guide.md)。
   - Blazor 现代颜色布局：读取 [现代颜色布局 Blazor 指南](../../.markdown/modern-color-layout-blazor-agent-guide.md)。
5. 如果需求引入模板中不存在的业务概念，先确定其业务含义、授权主体、数据契约与真实数据源；不要从页面名称、示例模型或 `Core` 桩代码反推业务规则。
6. 选择任务真正涉及的一种 UI 表面或一个扩展点，做最小范围修改；只有需求明确跨表面时才同步扩展 MVC、Razor Pages 与 Blazor。
7. 按改动风险构建并验证实际路径；最后复查差异、生成内容和敏感文件边界。

局部任务不要一次性加载全部 references 或两份布局指南。

## 模板专属约束

- `Pages/` 才是 cshtml Razor Pages；`Views/` 是 MVC；名为 `RazorPages/` 的目录实际存放可路由 Blazor `.razor` 组件。修改登录、布局或路由前必须先选定表面。
- `Configure.InitialTypeRegister()` 在创建 builder 前设置进程级 MongoDB 与 Newtonsoft.Json 行为。移动、重复或删除它会改变全局序列化契约，必须检查兼容性和安全影响。
- 配置模式当前由 `#if DEBUG` 选择 `DebugConfig()` 或 `ReleaseConfig()`，这是编译配置，不是 `ASPNETCORE_ENVIRONMENT`。不要把二者混为一谈。
- Swagger、SignalR、WebAuthn、Turnstile、DevApp、API 解密和自定义 Hosted Service 是预留接线示例，不是默认能力；其中可能缺包、包含占位类型，或像 `SilmoonDevAppServiceImpl.cs` 一样被项目文件排除编译。
- `Core.GetUser/NewUser`、固定用户数据、MD5 密码处理、示例 MongoDB URI、进程内上传缓存、演示 Controller/Hub/Page 都是 scaffold，不是生产持久化、安全或分布式保证。保留兼容行为与把它宣传为安全默认值是两回事。
- 当前固定 TFM 与 NuGet 版本只是目标项目快照。修改时读取当前 `.csproj` 和还原结果，不把版本号复制成技能中的永久要求，也不因技能触发而升级依赖。
- 外层包装项目从物理工作区收集内容；`.gitignore` 不能阻止 ignored 文件进入 `.nupkg`。打包或发布前必须执行 archive manifest 检查，并拒绝携带 Data Protection keys、本地配置、用户文件或其他本机状态。

## 伴随技能边界

以下技能可用且各自门禁成立时按需联用，不要在本技能中复制它们的规则：

- `$csharp-coding-style`：C# 文件编码、排版、成员、`using`、控制流与注释风格。
- `$silmoon-dotnet`：`Silmoon`/`Silmoon.Extensions` 包和基础 API 的真实语义。
- `$silmoon-aspnetcore`：`Silmoon.AspNetCore*` 的认证、Session、Blazor/JS、WebAuthn、Turnstile、binder、CORS 与安全边界。

模板文件位置和联动关系由本技能负责；库 API 事实由更具体的库技能或目标还原结果负责；代码外观由通过门禁的风格技能负责。伴随技能不可用时，回退到目标源码、程序集元数据、还原资产和编译结果，不猜测 API。本技能本身不授权新增、升级或替换依赖。

## 验证清单

- 构建了真正的内层 Web 项目，而不是只构建外层模板包装项目。
- 对受影响的 MVC、cshtml Razor Pages 或 Blazor 路径做了对应验证，没有把一个表面的成功当成另外两个表面也成功。
- 涉及认证、Session、静态资产、JS interop、中间件或路由时，验证了实际运行顺序和目标端点。
- 涉及前端库时以 `libman.json` 为源并完成 restore；没有直接维护被忽略的 `wwwroot/lib/` 产物。
- 只有修改模板生成或包装契约时才执行 pack/生成验证；归档内容不含本地配置、Data Protection key、IDE 用户文件或其他秘密。
- 最终差异只覆盖当前任务，并保留了用户已有的版本、配置与无关改动。
