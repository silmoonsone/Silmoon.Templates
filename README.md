# Requires attention:

Various functions need to be adjusted and turned on by looking at the comments in Program.cs.
Pay attention to restoring the NuGet package and libman.json client package!

If you have any questions, you can ask them in the discussion or contact the author.
sone@silmoon.com


## Usage:

使用 .NET 10 SDK 创建项目。示例项目名为 `Demo.Web`。首次使用 LibMan 时，先运行 `dotnet tool install --global Microsoft.Web.LibraryManager.Cli`。

```powershell
dotnet new install Silmoon.Templates
dotnet new ffweb -n Demo.Web -o Demo.Web
cd Demo.Web
libman restore
dotnet run
```

## Blazor 通用控件

模板通过 NuGet 包 `Silmoon.AspNetCore.Blazor` 使用确认框、下拉选择、多级菜单、日期范围、枚举、目录树、时间输入、内容卡片和数据表格。运行后访问 `/backend/components-demo` 查看示例。

现代颜色宿主配置、项目范围和旧 DataGrid 迁移见[模板接入指南](Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/_markdown/blazor-components-guide.md)。公共 API 和原生 Blazor 示例见[上层控件手册](https://github.com/silmoonsone/Silmoon.AspNetCore/blob/master/README/BlazorComponents.md)。已发布版本另附[NuGet 3.2.0 包说明](https://www.nuget.org/packages/Silmoon.AspNetCore.Blazor/3.2.0)。

库负责按需加载组件脚本，模板负责现代颜色适配。原生 Blazor 宿主可以使用库的默认样式，静态 cshtml 的入口和 Bootstrap 依赖见控件指南。

## 现代颜色框架维护

共享 CSS 和 JS（含可选 Blazor 初始化）由模板统一维护，9 个引用项目列在显式同步清单中：

```powershell
node tools/modern-color/manage.cjs --check
node tools/modern-color/manage.cjs --write
```

检查、同步、发布压缩包与回归验证见 [维护工具说明](tests/ModernColor/README.md)。工具保留可读源码与各项目业务布局，不操作 Git 暂存区，不提交或部署。

上述 9 项清单只管理现代颜色核心 CSS/JS；通用 Blazor 控件的历史分发项目、宿主差异及升级步骤另见[控件指南](Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/_markdown/blazor-components-guide.md)。`--write` 不会同步组件、`site.js` 或文档。
