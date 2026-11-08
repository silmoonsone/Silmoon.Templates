<!-- Provide an overview of what your template package does and how to get started.
Consider previewing the README before uploading (https://learn.microsoft.com/en-us/nuget/nuget-org/package-readme-on-nuget-org#preview-your-readme). -->

# Silmoon.Templates

### Fully functional templates for Silmoon projects.
使用 .NET 10 SDK 创建项目。示例项目名为 `Demo.Web`。首次使用 LibMan 时，先运行 `dotnet tool install --global Microsoft.Web.LibraryManager.Cli`。

维护项目时，建议将 NuGet 依赖尽量升级到与目标框架和其他依赖兼容的最新稳定版。在项目目录运行 `dotnet package list --outdated` 可查看可用更新。

```powershell
dotnet new install Silmoon.Templates
dotnet new ffweb -n Demo.Web -o Demo.Web
cd Demo.Web
libman restore
dotnet run
```

### Blazor 通用控件

生成的项目通过 NuGet 包 `Silmoon.AspNetCore.Blazor` 引用九个通用控件，覆盖确认、选择、菜单、表单、卡片和表格。还原依赖并启动后，访问 `/backend/components-demo`。

Blazor 自动加载库初始化模块，纯 cshtml 宿主可显式加载组件模块入口。现代颜色适配、静态及交互用法、旧 DataGrid 迁移见项目内 `_markdown/blazor-components-guide.md`。公共 API 和原生 Blazor 示例见[上层控件手册](https://github.com/silmoonsone/Silmoon.AspNetCore/blob/master/README/BlazorComponents.md)。发布版本和安装说明见 [NuGet 包页面](https://www.nuget.org/packages/Silmoon.AspNetCore.Blazor)。

### 项目内手册

- `_markdown/modern-color-layout-static-agent-guide.md`：cshtml 布局、菜单和全宽页脚。
- `_markdown/modern-color-layout-blazor-agent-guide.md`：Blazor 布局、初始化、增强导航和自定义页脚。
- `_markdown/blazor-components-guide.md`：通用控件 API、按需模块、静态／交互用法和迁移步骤。
- `_skills/silmoon-ffweb-template/SKILL.md`：模板／生成项目定位及 Agent 维护入口。
