# Requires attention:

Various functions need to be adjusted and turned on by looking at the comments in Program.cs.
Pay attention to restoring the NuGet package and libman.json client package!

If you have any questions, you can ask them in the discussion or contact the author.
sone@silmoon.com


## Usage:

> To install:
> ```cmd
> dotnet new install Silmoon.Templates
> dotnet new ffweb -n [ProjectName]
> ```
> **注意：创建项目后，必须运行以下命令以还原前端依赖：**
> ```cmd
> dotnet tool install --global Microsoft.Web.LibraryManager.Cli
> libman restore
> ```

## Blazor 通用控件

模板内置确认对话框、日期范围选择器、枚举选择、逻辑目录树、时间输入和可定制品牌的表单卡片。运行生成项目后访问 `/backend/components-demo` 查看交互示例。

接入方式见 [Blazor 通用控件说明](Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/_markdown/blazor-components-guide.md)。

## 现代颜色框架维护

共享 CSS 和 JS（含可选 Blazor 初始化）由模板统一维护，9 个引用项目列在显式同步清单中：

```powershell
node tools/modern-color/manage.cjs --check
node tools/modern-color/manage.cjs --write
```

检查、同步、发布压缩包与回归验证见 [维护工具说明](tests/ModernColor/README.md)。工具保留可读源码与各项目业务布局，不操作 Git 暂存区，不提交或部署。
