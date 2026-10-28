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

模板内置确认对话框、通用下拉选择、多级菜单、日期范围选择器、枚举选择、逻辑目录树、时间输入和通用内容与表单卡片 `ContentCard`。运行生成项目后访问 `/backend/components-demo` 查看常用示例；居中资料表单、多实例及异步交互位于页尾“更多交互示例”。

接入方式见 [Blazor 通用控件说明](Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/_markdown/blazor-components-guide.md)。

确认框、通用下拉框和多级菜单在组件内声明自己的模块，宿主保留 `site.js` 通用加载入口、隔离样式、Bootstrap 5 bundle（含 Popper）和图标即可，不再在 `App.razor` 或静态布局逐个引用组件脚本。已有项目迁移时，按指南同步配套文件、加载入口和缓存引用；当前源码更改不表示已发布到 NuGet。

## 现代颜色框架维护

共享 CSS 和 JS（含可选 Blazor 初始化）由模板统一维护，9 个引用项目列在显式同步清单中：

```powershell
node tools/modern-color/manage.cjs --check
node tools/modern-color/manage.cjs --write
```

检查、同步、发布压缩包与回归验证见 [维护工具说明](tests/ModernColor/README.md)。工具保留可读源码与各项目业务布局，不操作 Git 暂存区，不提交或部署。

上述 9 项清单只管理现代颜色核心 CSS/JS；通用 Blazor 控件的 12 个已确认项目、宿主差异和手动迁移步骤另见[控件指南](Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/_markdown/blazor-components-guide.md)。`--write` 不会同步组件、`site.js` 或文档。
