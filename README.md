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
