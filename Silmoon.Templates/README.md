<!-- Provide an overview of what your template package does and how to get started.
Consider previewing the README before uploading (https://learn.microsoft.com/en-us/nuget/nuget-org/package-readme-on-nuget-org#preview-your-readme). -->

# Silmoon.Templates

### Fully functional templates for Silmoon projects.
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

### Blazor 通用控件

包含确认对话框、通用下拉选择、多级菜单、日期范围选择器、枚举选择、逻辑目录树、时间输入和可定制品牌的表单卡片。生成项目启动后访问 `/backend/components-demo`，接入方式见项目内 `_markdown/blazor-components-guide.md`。

确认框、通用下拉框和多级菜单由组件声明自己的 JavaScript 模块。保留宿主的 `wwwroot/js/site.js` 通用加载入口、应用隔离样式、Bootstrap 5 bundle（含 Popper）及 Bootstrap Icons，不再向 `App.razor`、`_BlankLayout.cshtml` 添加组件专用脚本。下拉框的 `@bind-Value` 需要交互渲染，真实 `Href` 链接可用于静态 SSR；具体示例和已有项目迁移步骤见上述控件指南。

### 项目内手册

- `_markdown/modern-color-layout-static-agent-guide.md`：cshtml 布局、菜单和全宽页脚。
- `_markdown/modern-color-layout-blazor-agent-guide.md`：Blazor 布局、初始化、增强导航和自定义页脚。
- `_markdown/blazor-components-guide.md`：通用控件 API、按需模块、静态／交互用法和迁移步骤。
- `_skills/silmoon-ffweb-template/SKILL.md`：模板／生成项目定位及 Agent 维护入口。
