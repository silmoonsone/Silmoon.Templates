# ffweb 模板创作与打包

只在任务涉及外层模板包、`.template.config/template.json`、名称/端口替换、LibMan、pack、发布或从包生成项目时读取本文。普通生成项目业务修改不需要本文。

## 两层项目职责

- 外层 `Silmoon.Templates/Silmoon.Templates.csproj` 是 NuGet Template 包装项目。它声明 `PackageType=Template`、把 `content/**` 收进包，并不承载 Web 应用运行时。
- 内层 `Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/Silmoon.AspNetCore.FullFunctionTemplate.csproj` 才是生成项目的 Web `.csproj` 和直接构建目标。
- `.template.config/template.json` 定义 template engine 的身份与替换契约。

修改 Web 功能时构建内层项目；修改包内容或生成契约时才同时验证外层 pack。只构建外层包装项目不能证明生成的 Web 应用可编译或运行。

## 生成契约

当前模板 identity 与 `sourceName` 是 `Silmoon.AspNetCore.FullFunctionTemplate`，short name 是 `ffweb`。`sourceName` 与 `ClassName` replacement 负责把原始项目名、命名空间、文件名和内容中的同名标记替换为生成项目名。

模板还以 random generator 替换 launch settings 中的两个占位端口：HTTP `5140` 与 HTTPS `7045`。修改这些数字、launch profile 或 symbol 时必须保持 `template.json` 与源文件同步。

不要只在默认名称下测试。涉及生成契约时，用一个明显不同且合法的非默认项目名生成，至少检查：

- 目录、`.csproj`、程序集名和根命名空间已替换。
- `Program.cs`、Razor imports、CSS isolation 生成链接和页面标题没有残留原始项目名。
- launch settings 的 HTTP/HTTPS 端口已替换且有效。
- 生成输出不包含 `.template.config` 或其他仅供模板引擎使用的内容，除非目标契约明确要求。

生成项目可能由用户继续修改。维护生成项目时不要重新套用当前上游模板覆盖其业务差异。

## NuGet 与 TFM

外层和内层项目的 TFM、包版本与 package version 都会演进。技能不维护固定版本表；每次从当前两个 `.csproj`、中央包管理、还原资产和构建结果读取事实。

更新内层包引用并不自动授权更新外层模板包版本；更新外层版本也不证明内层依赖已验证。分别处理并保留用户已有版本改动。

## LibMan 与静态前端依赖

`libman.json` 是 jQuery、Bootstrap、jquery-ajax-unobtrusive、Bootstrap Icons 和 SignalR 浏览器脚本的源声明。`wwwroot/lib/` 被模板 `.gitignore` 忽略，README 也要求生成后运行 `libman restore`。

- 不直接编辑、审查或提交 `wwwroot/lib/` 中的还原产物来完成依赖升级；修改 `libman.json` 并重新 restore。
- 生成项目需要相关页面或布局时，从项目根执行 LibMan restore，再验证浏览器请求路径。
- `@latest` 等浮动前端版本会使未来 restore 结果变化；需要可复现性时在当前任务授权范围内固定并验证版本。
- 打包前明确选择“随模板运输”还是“生成后 restore”。不要一边让 README 要求 restore，一边无意把整个本机还原目录塞进包。

## 物理工作区与 pack 内容

外层包装项目当前启用 `NoDefaultExcludes`，并用宽泛的 `Content Include="content\**\*"` 收集文件，显式排除主要只有 inner `bin/` 与 `obj/`。NuGet pack 读取物理文件，不读取 Git 是否跟踪；因此 `.gitignore` 不是包排除规则。

这不是理论风险：本地被忽略的 Data Protection key、`config.local*.json`、`.csproj.user` 与还原后的 `wwwroot/lib/` 都可能进入 `.nupkg`。不得读取或输出其中的秘密来做普通清单检查，只检查路径和类型即可。

打包或发布前必须：

1. 检查内容根的物理文件，而不只看 `git status` 或 `git ls-files`。
2. 把需要运输的模板源与本机/运行时状态分开；优先用明确 pack exclude 修正长期规则，或从已验证的干净工作区打包。
3. 把输出写到明确的临时或任务输出目录，避免误覆盖用户已有 `.nupkg`。
4. 打开最终 `.nupkg` 的 archive manifest，确认不存在以下内容：
   - `DataProtection/key-*.xml` 或其他运行时密钥。
   - `config.local*.json`、秘密文件、证书和本机连接配置。
   - `*.csproj.user`、IDE/用户状态、日志、数据库和临时文件。
   - 非预期的 `wwwroot/lib/`、build output 或缓存目录。
5. 发现上述内容时停止发布；修正 pack include/exclude 或工作区来源后重新生成并再次检查。不要以“文件已被 Git 忽略”作为放行理由。

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
- 最终差异没有覆盖用户已有的包版本或无关文件。
