# ffweb 模板创作与打包

只在任务涉及外层模板包、`.template.config/template.json`、名称/端口替换、LibMan、pack、发布或从包生成项目时读取本文。普通生成项目业务修改不需要本文。

## 两层项目职责

- 外层 `Silmoon.Templates/Silmoon.Templates.csproj` 声明 `PackageType=Template`，从 `content/` 收录模板源码、示例配置、静态资源和手册。
- 内层 `Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/Silmoon.AspNetCore.FullFunctionTemplate.csproj` 才是生成项目的 Web `.csproj` 和直接构建目标。
- `.template.config/template.json` 定义 template engine 的身份与替换契约。

修改 Web 功能时构建内层项目；修改包内容或生成契约时才同时验证外层 pack。只构建外层包装项目不能证明生成的 Web 应用可编译或运行。

## 生成契约

当前模板 identity 与 `sourceName` 是 `Silmoon.AspNetCore.FullFunctionTemplate`，short name 是 `ffweb`。`sourceName` 与 `ClassName` replacement 将项目文件名和应用源码中的名称替换为生成项目名。`_markdown/` 和 `_skills/` 采用 `copyOnly`，保留手册中引用的上游目录、模板身份和端口示例。

模板还以 random generator 替换 launch settings 中的两个占位端口：HTTP `5140` 与 HTTPS `7045`。修改这些数字、launch profile 或 symbol 时必须保持 `template.json` 与源文件同步。

不要只在默认名称下测试。涉及生成契约时，用一个明显不同且合法的非默认项目名生成，至少检查：

- 目录、`.csproj`、程序集名和根命名空间已替换。
- `Program.cs`、Razor imports、CSS isolation 生成链接和页面标题没有残留原始项目名。
- launch settings 的 HTTP/HTTPS 端口已替换且有效。
- 生成输出不包含 `.template.config` 或其他仅供模板引擎使用的内容，除非目标契约明确要求。

生成项目可能由用户继续修改。维护生成项目时不要重新套用当前上游模板覆盖其业务差异。

## NuGet 与 TFM

维护模板依赖时，建议尽量升级到与目标框架和其他依赖兼容的最新 NuGet 稳定版。以两个 `.csproj`、中央包管理配置（如有）和还原结果核对使用的版本，更新后运行构建及相关回归。发布和验收记录应注明实际测试版本。

更新内层包引用并不自动授权更新外层模板包版本；更新外层版本也不证明内层依赖已验证。分别处理并保留用户已有版本改动。

模板通过 `PackageReference` 使用 `Silmoon.AspNetCore.Blazor` 的九个公共控件。验证模板包时，在仓库外生成不同名称的项目，从 NuGet 还原并执行 Release 发布，检查隔离样式和组件脚本。

## LibMan 与静态前端依赖

`libman.json` 是 jQuery、Bootstrap、jquery-ajax-unobtrusive、Bootstrap Icons 和 SignalR 浏览器脚本的源声明。`wwwroot/lib/` 被模板 `.gitignore` 忽略，README 也要求生成后运行 `libman restore`。

- 不直接编辑、审查或提交 `wwwroot/lib/` 中的还原产物来完成依赖升级；修改 `libman.json` 并重新 restore。
- 生成项目需要相关页面或布局时，从项目根执行 LibMan restore，再验证浏览器请求路径。
- `@latest` 等浮动前端版本会使未来 restore 结果变化；需要可复现性时在当前任务授权范围内固定并验证版本。
- 打包前明确选择“随模板运输”还是“生成后 restore”。不要一边让 README 要求 restore，一边无意把整个本机还原目录塞进包。

## 物理工作区与 pack 内容

外层项目先用 `<Content Include="content\**\*" />` 递归收录物理工作目录里的文件，随后逐条用 `<Content Remove="..." />` 排除指定路径。新增的模板目录、文件类型和配置示例默认随包分发。`NoDefaultExcludes` 使包可以保留 `.gitignore` 和 `.template.config/template.json`。

在仓库根运行 `dotnet msbuild Silmoon.Templates/Silmoon.Templates.csproj -getItem:Content` 可查看排除后的候选路径。现有 `Content Remove` 条目覆盖本机配置、Data Protection 密钥、构建缓存和已还原的 `wwwroot/lib/`。新增本机状态未被现有条目覆盖时，在 `Include` 后添加相应的 `Content Remove`。`.gitignore` 只影响 Git，最终入包内容以 `.nupkg` 的文件列表为准。

打包或发布前必须：

1. 检查内容根的物理文件，而不只看 `git status` 或 `git ls-files`。
2. 确认新增的模板源文件出现在打包清单中，仅开发机使用的文件未被选中。
3. 把输出写到明确的临时或任务输出目录，避免误覆盖用户已有 `.nupkg`。
4. 打开最终 `.nupkg` 的 archive manifest，确认不存在以下内容：
   - `DataProtection/key-*.xml` 或其他运行时密钥。
   - `config.local*.json`、秘密文件、证书和本机连接配置。
   - `*.csproj.user`、IDE/用户状态、日志、数据库和临时文件。
   - 非预期的 `wwwroot/lib/`、build output 或缓存目录。
5. 如果归档中含有上述文件，修正相应的 `Content Remove` 条目，再次打包并核对归档。

本技能不授权删除本机 key、配置或用户文件。若需要清理，先精确确认目标和恢复影响；修正包装规则通常比删除工作区状态更可靠。

## 分层验证

根据改动选择验证，不把每次业务修改都扩大成发布流程。

### 只改运行时代码

1. restore 并构建内层 Web 项目。
2. 按受影响的 UI/服务做针对性运行验证。
3. 只有当改动还影响模板生成或包内容时才继续 pack。

### 修改包装或模板引擎契约

1. 先构建内层 Web 项目。
2. pack 外层模板项目到隔离输出目录。
3. 检查最终 archive manifest 与内容卫生。
4. 在新的临时目录、隔离 template hive 或其他不会覆盖用户项目的方式中，用非默认项目名生成实例。
5. 在生成项目根 restore NuGet 与 LibMan，再构建生成项目。
6. 涉及路由、宿主、认证、静态资产或布局时启动生成项目并做针对性 smoke test。
7. 检查生成项目中没有原始命名空间残留、端口替换错误或仅模板维护所需的本机文件。

全局安装或替换本机 `dotnet new` 模板会改变外部状态；只有任务明确需要时才这样做。优先使用隔离验证方式，并保留用户已有模板安装状态。

## 发布前最终检查

- 外层版本变更是用户要求或发布流程的一部分，不是 pack 的隐式副作用。
- inner Web 项目与从包生成的非默认名称项目都能构建。
- 归档内容与 LibMan 运输策略一致。
- 包中不含本地配置、Data Protection key、IDE 用户文件、日志或其他秘密。
- `.template.config` 的 identity、short name、`sourceName`、文件替换和随机端口与源内容一致。
- 生成项目包含 `_skills/silmoon-ffweb-template/` 下的 `SKILL.md`、`agents/openai.yaml` 与参考文档，并保持 UTF-8 BOM 和 CRLF。
- 生成项目应引用包含九个控件的公共库，并能从 `_content/Silmoon.AspNetCore.Blazor/` 加载隔离样式和 JS。包 README 与 `_markdown` 手册应说明一致的接入方式。
- 最终差异没有覆盖用户已有的包版本或无关文件。
