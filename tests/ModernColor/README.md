# 现代颜色框架维护与回归

共享核心以当前模板 `Silmoon.Templates/content/Silmoon.AspNetCore.FullFunctionTemplate/wwwroot` 为维护源。`tools/modern-color/manifest.json` 明确列出 9 个仓库及其静态资源目录；只有 CSS 和核心 JS 受工具管理。账户菜单、认证、本地化、交易工作区和品牌页脚仍由各项目维护，不由工具覆盖。

## 检查与同步

在 Silmoon.Templates 仓库根目录运行，仅需要 Node.js：

```powershell
node tools/modern-color/manage.cjs --check
node tools/modern-color/manage.cjs --write
node tools/modern-color/manage.cjs --check
```

默认是只读检查。差异或缺失仓库会返回非零退出码。执行 `--write` 前应检查各项目工作区，确认核心文件没有尚未吸收的定制；工具不会修改 Git 暂存区，也不会提交或推送。写入前会验证全部目标存在、属于配置的仓库且没有通过路径或符号链接越界，写入后再核验 SHA-256。

不在同一父目录时修改清单中的仓库路径。只维护单个克隆可指定项目，不会默默忽略其他项目：

```powershell
node tools/modern-color/manage.cjs --check --project Silmoon.Templates
```

新增引用项目时更新清单；业务布局和资源版本仍须检查。ASP.NET 项目通过项目内的 `ModernColorLayoutInitializer` 维护 Blazor 版本，Razor Pages 保留 `asp-append-version`；HTML 示例维护自己的查询版本。核心文件一致不代表页面结构、业务样式或缓存版本已自动适配。

## 发布压缩包

`manage.cjs` 统一提供 `--check`、`--write`、`--build` 三种互斥操作，默认只读检查。压缩工具只有开发依赖，各 ASP.NET 项目不需要安装 Node 包，也不需要改变运行时管线。安装使用锁文件，并禁用依赖安装脚本：

```powershell
pnpm --dir tools/modern-color install --frozen-lockfile --ignore-scripts
pnpm --dir tools/modern-color build
pnpm --dir tools/modern-color test
```

`dist/` 中生成保持原公开路径的 `css/modern-color-layout.css`、`js/modern-color-layout.js`，以及每个文件的 `.gz`、`.br` 和带源文件/产物散列的 `asset-manifest.json`。产物目录和依赖目录被 Git 忽略。发布时可将压缩后的 CSS/JS 放进发布目录的对应路径；不要把产物反向同步到可读源码仓库。此命令不执行部署。

CSS 采用 [clean-css](https://github.com/clean-css/clean-css) 的一级压缩，关闭依赖内联和 URL 重写，保留选择器结构与浏览器回退。JS 使用 [Terser](https://github.com/terser/terser)，不重命名公共对象属性。`.gz`/`.br` 只是预压缩产物，服务器需要正确配置内容协商、`Content-Encoding` 和 `Vary: Accept-Encoding` 才能使用；不能仅把带压缩后缀的文件当普通文本返回，也不能据此宣称线上已开启压缩。

## 布局与菜单回归

从仓库根目录运行，无需安装 npm 包：

```powershell
node --test tests/ModernColor/*.test.cjs
node tests/ModernColor/ModernColorMenuPreview.cjs
```

测试直接加载模板的 `wwwroot/js/modern-color-layout.js`，验证点击新页面时不会被旧 `aria-current="page"` 误导、当前子项父级自动展开、非当前组保留手动状态及匹配 hash 的激活优先级。未匹配 hash 继续按当前 DOM 的激活标记处理。

生命周期测试覆盖重复初始化、返回顶部节点替换、移动菜单原片段替换、监听器释放和重新初始化。尺寸测试覆盖滚动与缩放共用一帧更新、未变化的高度不重复写入、页脚避让、旧版无页脚布局、手机长菜单以及可视视口变化。核心的可选 Blazor 初始化测试验证进入现代布局时刷新、离开时释放，并确保只注册一次 `enhancedload`。

预览程序绑定随机回环端口，加载模板实际 CSS、核心 JS（包含可选 Blazor 初始化）；静态依赖使用模板 `libman.json` 还原后的 `wwwroot/lib`。导航由合成菜单和模拟 `enhancedload` 实现，不等同于真实 Blazor 站点联调。

浏览器检查：

1. 打开输出的设置页，确认“系统设置”自动展开。
2. 手动收起“系统设置”，再点击“概览”，确认原分组仍收起。
3. 手动打开“系统维护”，导航到其他页面，确认该分组保持展开。
4. 回到“常规设置”，确认其父级展开；收起后刷新，确认再次自动展开。
5. 点击“重复初始化”“销毁再初始化”“替换返回顶部”，确认菜单点击只响应一次，长页滚动后返回顶部仍正常。
6. 检查 `/layout/empty`、`/layout/short` 和 `/layout/long`：空页和短页页脚位于底部，长页页脚横跨菜单及内容；滚动到底部时桌面菜单顶部位置保持稳定。
7. 在 390px、640px 等手机宽度打开 `/layout/long-menu`，确认整个菜单可滚动到最后一项；切换页面后只有一个菜单，返回桌面宽度后菜单恢复原位置。
8. 通过页面链接进入 `/layout/plain`，确认返回顶部按钮被移除；返回现代布局后控件正常恢复。此过程模拟片段替换，预览程序不会手动删除旧的移动菜单。
9. 检查桌面、手机宽度及亮暗主题；缩短手机视口或使用浏览器可视视口能力确认菜单底部仍可到达。

验证后以 Ctrl+C 停止预览。

构建压缩资源后，可以让同一测试加载产物。Blazor 适配逻辑已包含在核心脚本中：

```powershell
$env:MODERN_COLOR_SCRIPT_PATH = (Resolve-Path tools/modern-color/dist/js/modern-color-layout.js).Path
node --test tests/ModernColor/ModernColorMenu.test.cjs
Remove-Item Env:MODERN_COLOR_SCRIPT_PATH
```

预览也可使用产物目录。此变量只覆盖现代布局 CSS/JS；Bootstrap、图标等静态依赖仍从模板 `wwwroot/lib` 加载：

```powershell
$env:MODERN_COLOR_ASSET_ROOT = (Resolve-Path tools/modern-color/dist).Path
node tests/ModernColor/ModernColorMenuPreview.cjs
# 停止预览后清除变量，恢复默认源文件。
Remove-Item Env:MODERN_COLOR_ASSET_ROOT
```

2026-10-28：源码与压缩版各 22 项行为回归通过；HtmlColorScheme 和 Trading 的核心测试各 22 项通过。离线浏览器验证了 1280×800 下亮暗主题均为 1000px 布局宽度、空正文页脚靠底、长页底部菜单 top=20px、390×600 下 30 项子菜单及末端主题按钮可滚动到达、片段导航无重复菜单、离开现代布局后释放并可重新进入。压缩版复核了相同的主题宽度、空页和手机长菜单场景；原生 HTML 示例的下拉浮层背景不透明且不被卡片裁切。上述浏览器测试不启动实际业务服务，也不替代真实 Blazor 联调。同步工具核对 9 个项目共 18 份核心资源零差异，本次涉及布局代码的 6 个 ASP 项目隔离构建通过；Blockchain 项目仍受已有 NU1605 依赖降级错误阻断。

2026-10-14：旧核心脚本在同组 8 项断言中有 4 项失败，接入修复后全部通过；与控件回归合计 80 项通过。模板 Web 项目构建 0 警告、0 错误。离线浏览器检查通过桌面和 390×844 视口、跨页面收起/展开状态、当前子页刷新、重复初始化及亮暗主题；控制台无警告或错误。
