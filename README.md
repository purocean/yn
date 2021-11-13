# Yank Note

一款面向程序员的 Markdown 笔记应用 **[在线体验>>>](https://yank-note.vercel.app/)**

[![Download](./help/mas_en.svg?.inline)](https://apps.apple.com/cn/app/yank-note/id1551528618)

[toc]{level: [2]}

![截图](./help/1.png)

## 特色

- **使用方便**：使用 Monaco 内核，专为 Markdown 优化，拥有和 VSCode 一样的编辑体验。
- **功能强大**：可在文档中嵌入小工具、可运行的代码块、表格、Plantuml 图形、Drawio 图形、宏替换等。
- **兼容性强**：数据保存为本地 Markdown 文件；拓展功能尽量用 Markdown 原有的语法实现。
- **插件拓展**：支持用户编写自己的插件来拓展编辑器的功能。
- **支持加密**：用来保存账号等隐私文件，文件可单独设置密码。

## 注意事项

- Yank Note 是一款**针对程序员**的 Markdown 编辑器，目标应用场景为在本机写文章、做笔记。
- 为了更高的拓展性和方便性，Yank Note 牺牲了安全防护（命令执行，任意文件读写）。如果要用它打开外来 Markdown 文件，**请务必仔细甄别文件内容是值得信任的**。
- 加密文件的加密解密操作均在前端完成，请**务必牢记自己的密码**。一旦密码丢失，就只能暴力破解了。

## Yank-Note V3 开发计划

V3 核心目标是重构代码，提升应用健壮性、可拓展性、Markdown 渲染性能

[V3 项目看板](https://github.com/purocean/yn/projects/5)

- [x] 使用 Vite 构建
- [x] 优化 Markdown 渲染性能，支持 Vue 组件方式拓展功能
- [x] 重构 Electron 代码
- [x] 重构业务逻辑，和组件解耦
- [x] 完善自定义插件文档
- [ ] 增强文档检索，引用体验
- [ ] 重构快捷键处理层，支持自定义快捷键
- [ ] 其他 V2 未完成的功能
- [ ] 增加移动端

## 特色功能

以下功能具体使用可参考[特色功能说明](./help/FEATURES.md)

- 同步滚动：编辑区和预览区同步滚动，预览区可独立滚动
- 目录大纲：预览区目录大纲快速跳转
- 文件加密：以 `.c.md` 结尾的文件视为加密文件
- 自动保存：文件编辑后自动保存，未保存文件橙色标题栏提醒（加密文档不自动保存）
- 编辑优化：列表自动补全
- 粘贴图片：可快速粘贴剪切板里面的图片，可作为文件或 Base64 形式插入
- 嵌入附件：可以添加附件到文档，点击在系统中打开
- 代码运行：支持运行 JavaScript、PHP、nodejs、Python、bash 代码
- 待办列表：支持显示文档中的待办进度，点击可快速切换待办状态
- 快速打开：可使用快捷键打开文件切换面板，以便快捷打开文件，标记的文件，全文搜索文件内容
- 内置终端：支持在编辑器打开终端，快速切换当前工作目录
- 公式解析：支持输入 katex 公式代码
- 样式风格：Markdown 使用 GitHub 风格样式和特性
- 数据仓库：可定义多个数据位置以便文档分类
- 外链转换：将外链或 BASE64 图片转换为本地图片
- HTML 解析：可以直接在文档里面使用 HTML 代码，也可以使用快捷键粘贴复制 HTML 为 Markdown
- docx 导出：后端使用 pandoc 做转换器
- TOC 支持：生成 TOC 在需要生成目录的地方写入 `[toc]{type: "ol", level: [1,2,3]}` 即可
- 编辑表格单元格：双击表格单元格即可快速编辑
- 复制标题链接：复制标题链接路径到剪切板，便于插入到其他文件
- 嵌入小工具：文档支持内嵌 HTML 小工具
- 嵌入 Plantuml 图形：需要安装 Java，graphviz
- 嵌入 drawio 图形：文档支持内嵌 drawio 图形
- 嵌入 ECharts 图形：在文档中嵌入 Echarts 图形
- 嵌入 Mermaid 图形：在文档中嵌入 Mermaid 图形
- 嵌入 Luckysheet 表格：在文档中嵌入 Luckysheet 表格
- 嵌套列表转脑图展示：可将嵌套列表用脑图的方式展示
- 元素属性书写：可自定义元素的任意属性
- 表格解析增强：表格支持表格标题多行文本，列表等特性
- 文档交叉链接跳转：支持在文档中链接其他文档，互相跳转
- 脚注功能：支持在文档中书写脚注
- 容器块：支持类似 VuePress 默认主题的自定义容器
- 宏替换：支持内嵌 JavaScript 表达式动态替换文档内容
- 图床：支持 [PicGo](https://picgo.github.io/PicGo-Doc/) 图床
- 自定义插件：支持编写 JavaScript 插件拓展编辑器功能。插件放置在 `主目录/plugins` 中。参考[插件开发指南](./help/PLUGIN.md)

## 界面截图

![截图](./help/2.png)
![截图](./help/3.png)
![截图](./help/4.png)

## 更新日志

[最新发布](https://github.com/purocean/yn/releases)

### [v3.11.0](https://github.com/purocean/yn/releases/tag/v3.11.0) 2021-11-13
1. Add English language.
2. Macro definition supports asynchronous expressions.
3. Support quoting other document fragments in the document.
4. Fine-tune the UI.
5. Plug-in development:
     - Added service `ctx.i18n`.
     - Added method `ctx.view.render`.
     - Rename the hook `VIEW_REFRESH` to `VIEW_AFTER_REFRESH`.
     - Added hooks.
         - `I18N_CHANGE_LANGUAGE`
         - `SETTING_FETCHED`
         - `SETTING_BEFORE_WRITE`
         - `VIEW_BEFORE_REFRESH` 

<details>
<summary>展开查看更多版本记录</summary>

### [v3.10.3](https://github.com/purocean/yn/releases/tag/v3.10.3) 2021-11-10
1. 修复长时间运行命令导致主进程阻塞问题
2. 修复代码块操作按钮滚动定位问题
3. 修复一些情况下渲染刷新问题
4. 插件：移除 `ctx.bus` 事件总线，使用钩子代替

### [v3.10.2](https://github.com/purocean/yn/releases/tag/v3.10.2) 2021-11-05
1. 增加宏替换功能
2. 增加 Front Matter 解析
3. 增加标题序号展示
4. 切换待办状态支持快捷键 `Alt + O`
5. 其他若干问题修复和优化
6. 插件：ON_VIEW_ELEMENT_CLICK ON_VIEW_ELEMENT_DBCLICK 钩子中可以获取到 view dom

### [v3.9.4](https://github.com/purocean/yn/releases/tag/v3.9.4) 2021-10-31
1. 修复 HTML 小工具编辑代码界面不更新问题
2. 修复 Windows 下终端不能正确切换目录问题
3. 其他交互体验优化
4. 插件开发：增加 `ctx.document.isSameRepo` 方法

### [v3.9.3](https://github.com/purocean/yn/releases/tag/v3.9.3) 2021-10-29
1. HTML 小工具支持无边框展示
2. 只读模式文件树禁用一些右键菜单
3. 限制 js 代码不能在终端运行
4. 优化空白页展示
5. 修复大文档锚点跳转时预览滚动位置可能不正确
6. 插件开发：增加插件开发指南文档
7. 插件开发：`ctx.shortcut` 重命名为 `ctx.command`

### [v3.9.1](https://github.com/purocean/yn/releases/tag/v3.9.1) 2021-10-28
1. 更新说明文档
2. 插件开发：`ctx.api.proxyRequest` 支持 Post 方式，传输大量数据

### [v3.9.0](https://github.com/purocean/yn/releases/tag/v3.9.0) 2021-10-27
1. 增加自定义图片上传目录配置
2. 目录树菜单增加复制名称、复制路径功能
3. 插件开发：`ctx` 增加 `args` `base` 模块

### [v3.8.2](https://github.com/purocean/yn/releases/tag/v3.8.2) 2021-10-24
1. 过于宽的表格增加横向滚动
2. 编辑器增加表格补全
3. 工具菜单增加更多内容
4. 导出默认使用 HTML 转换
5. 优化状态栏展示
6. 调整选中文本背景颜色

### [v3.8.0](https://github.com/purocean/yn/releases/tag/v3.8.0) 2021-10-23
1. 增加 PicGo 图床支持
2. 文档没有目录时候隐藏目录按钮
3. 微调界面样式
4. 插件开发：`ctx` 增加 `lib`，可以使用一些安装的 npm 模块
5. 插件开发：新增临时文件接口
6. 插件开发：增加 `ON_PASTE_IMAGE` 钩子事件，用以拦截粘贴图片行为

### [v3.7.1](https://github.com/purocean/yn/releases/tag/v3.7.1) 2021-10-21
1. 新增自定义容器块功能
2. 预览界面目录新增固定按钮
3. 终端优化：新增收起按钮、状态栏新增快速切换终端按钮
4. 上传附件和图片功能优化：增加多选、文件名保留原始文件名、路径增加 `./`
5. 快捷键说明放置在单独文档

### [v3.6.9](https://github.com/purocean/yn/releases/tag/v3.6.9) 2021-10-13
1. 微调样式

### [v3.6.8](https://github.com/purocean/yn/releases/tag/v3.6.8) 2021-09-30
1. 新增自定义图片尺寸功能
2. 链接图标不使用背景方式，便于打印
3. 微调样式

### [v3.6.7](https://github.com/purocean/yn/releases/tag/v3.6.7) 2021-09-18
1. 优化链接图标
2. 优化省略协议的链接解析
3. HTML 解析支持多行注释

### [v3.6.5](https://github.com/purocean/yn/releases/tag/v3.6.5) 2021-09-16
1. 调整强制插入新行快捷键
2. 外部链接增加小图标
3. 修复表格鼠标悬停样式问题

### [v3.6.4](https://github.com/purocean/yn/releases/tag/v3.6.4) 2021-09-09
1. 调整脚注展示
2. 修复目录动画闪烁问题
3. 修复终端中执行退出判定

### [v3.6.2](https://github.com/purocean/yn/releases/tag/v3.6.2) 2021-09-08
1. 增加复制代码块按钮
2. 增加清空代码运行结果按钮
3. 标题锚点不再增加 `h-` 前缀
4. 微调 UI

### [v3.6.1](https://github.com/purocean/yn/releases/tag/v3.6.1) 2021-09-06
1. 导出功能支持使用 Markdown 直接转换
2. Chrome 93 固定强调色
3. 优化输入建议

### [v3.6.0](https://github.com/purocean/yn/releases/tag/v3.6.0) 2021-09-01
1. 增强导出功能，支持导出多种格式

### [v3.5.7](https://github.com/purocean/yn/releases/tag/v3.5.7) 2021-08-26
1. 微调界面配色
2. 插件目录下的文件现在可以被访问
3. 编辑器上下文菜单增加粘贴相关功能
4. 优化内置终端语言判断和路径解析逻辑

### [v3.5.6](https://github.com/purocean/yn/releases/tag/v3.5.6) 2021-08-20
1. 微调界面配色
2. 在内存中缓存代码运行结果

### [v3.5.5](https://github.com/purocean/yn/releases/tag/v3.5.5) 2021-08-18
1. 微调界面配色
2. 图片支持行内模式展示

### [v3.5.3](https://github.com/purocean/yn/releases/tag/v3.5.3) 2021-08-15
1. 修复点击配置菜单不工作问题
2. 修复一些 UI 展示问题
3. 优化一些交互体验

### [v3.5.2](https://github.com/purocean/yn/releases/tag/v3.5.2) 2021-08-06
1. 浏览器中使用时候隐藏标题栏
2. 文档标签增加状态指示
4. 修复保存加密文件取消输入密码内容被还原问题
3. 修复一些 UI 展示问题
5. 优化一些交互体验

### [v3.5.1](https://github.com/purocean/yn/releases/tag/v3.5.1) 2021-08-05
1. 调整界面基础字体为系统字体
2. 增加单独保存预览窗口滚动条位置
3. drawio 图形增加重载按钮
4. 修复复制标题链接有可能丢失 / 问题
5. 修复演示模式预览图片按 Esc 退出演示模式问题
6. 修复 drawio 网络慢的时候不能调整高度问题
7. 修复某些情况下切换演示模式页面样式不正确问题

### [v3.5.0](https://github.com/purocean/yn/releases/tag/v3.5.0) 2021-08-03
1. 新增导航菜单，前进后退功能
2. 优化预览模式点击交互

### [v3.4.2](https://github.com/purocean/yn/releases/tag/v3.4.2) 2021-08-02
1. 修复表格行号展示
2. 修复 Esc 快捷键冲突问题
3. 调整 macOS 上快捷键展示

### [v3.4.1](https://github.com/purocean/yn/releases/tag/v3.4.1) 2021-08-01
1. 新增演示模式
2. 新增隐藏编辑器功能
3. 优化状态栏菜单展示

### [v3.3.7](https://github.com/purocean/yn/releases/tag/v3.3.7) 2021-07-19
1. 修复帮助菜单不工作问题
2. 修复工具转换外链图片菜单不工作问题

### [v3.3.6](https://github.com/purocean/yn/releases/tag/v3.3.6) 2021-07-16
1. 微调样式
2. 修复快捷键相关问题

### [v3.3.5](https://github.com/purocean/yn/releases/tag/v3.3.5) 2021-07-14
1. 微调样式
2. 图片预览去掉播放按钮
3. 修复 Safari 不能打开嵌入页面问题
4. 修复对话框输入框意外触发确认问题

### [v3.3.4](https://github.com/purocean/yn/releases/tag/v3.3.4) 2021-07-13
1. 修复终端主题不正确和不能正确初始化问题
2. 修复终端不能正确初始化问题
3. 修复表格不能插入图表问题

### [v3.3.3](https://github.com/purocean/yn/releases/tag/v3.3.3) 2021-07-13
1. 嵌入文档表格增加统计栏
2. 修复表格保存校验问题
3. 修复标签颜色不正确问题

### [v3.3.2](https://github.com/purocean/yn/releases/tag/v3.3.2) 2021-07-13
1. 增加浅色主题
2. 增加 Luckysheet 表格嵌入
3. 优化应用窗口使用体验

### [v3.2.2](https://github.com/purocean/yn/releases/tag/v3.2.2) 2021-07-09
1. 优化文件切换体验，降低闪烁
2. HTML 小工具增加 ctx
3. 修复在终端中运行代码快捷键不正确
4. 修复本文档调整锚点不工作问题

### [v3.2.1](https://github.com/purocean/yn/releases/tag/v3.2.1) 2021-07-08
1. 运行代码功能支持运行浏览器 JS 代码
2. 修正 Windows 更新报错问题
3. 修复编辑器菜单“终端运行”菜单行为
4. 调整标题仓库名展示位置

### [v3.2.0](https://github.com/purocean/yn/releases/tag/v3.2.0) 2021-07-08
1. 编辑器增加右键菜单
2. 增加 Markdown 语法补全
3. 修复 Mermaid 图形编辑不能及时更新问题
4. 插件可拓展 Monaco Editor 功能
5. 重构编辑器相关代码

### [v3.1.2](https://github.com/purocean/yn/releases/tag/v3.1.2) 2021-07-06
1. 插件 ctx 新增 api 接口
2. 调整运行代码样式

### [v3.1.1](https://github.com/purocean/yn/releases/tag/v3.1.1) 2021-07-05
1. 增加图片预览功能

### [v3.1.0](https://github.com/purocean/yn/releases/tag/v3.1.0) 2021-07-05
1. 增加转换文档的提示
2. 调整标题栏文件保存状态展示
3. 重构业务逻辑，和组件解耦

### [v3.0.3](https://github.com/purocean/yn/releases/tag/v3.0.3) 2021-06-30
1. 优化添加仓库交互

### [v3.0.2](https://github.com/purocean/yn/releases/tag/v3.0.2) 2021-06-28
1. 调整标题保存状态
2. 修复可能不能打开终端问题

### [v3.0.1](https://github.com/purocean/yn/releases/tag/v3.0.1) 2021-06-27
1. 修复 Electron Scheme 模式下可能上传文件不成功问题

### [v3.0.0](https://github.com/purocean/yn/releases/tag/v3.0.0) 2021-06-27
1. 大幅优化 Markdown 渲染性能，编辑更流畅
2. 修复部分遗留问题，增强 Katex 公式渲染，文件相对路径解析
3. 新增工具菜单
4. 修复 Ubuntu 上不展示应用图标问题

### [v2.9.10](https://github.com/purocean/yn/releases/tag/v2.9.10) 2021-06-16
1. 增加双击编辑表格单元格功能

### [v2.9.9](https://github.com/purocean/yn/releases/tag/v2.9.9) 2021-06-10
1. 修复 Scheme 模式下终端不能使用问题

### [v2.9.8](https://github.com/purocean/yn/releases/tag/v2.9.8) 2021-06-10
1. 应用中打开页面增加 Scheme 模式

### [v2.9.7](https://github.com/purocean/yn/releases/tag/v2.9.7) 2021-06-09
1. 修复在终端中打开路径错误问题

### [v2.9.6](https://github.com/purocean/yn/releases/tag/v2.9.6) 2021-06-07
1. 修正 macOS 更新升级问题

### [v2.9.5](https://github.com/purocean/yn/releases/tag/v2.9.5) 2021-06-07
1. 新增窗口应用菜单
2. 增加添加仓库提示，弃用默认仓库

### [v2.9.4](https://github.com/purocean/yn/releases/tag/v2.9.4) 2021-06-06
1. 优化 macOS 上标题栏使用体验
2. 更换 macOS 应用图标

### [v2.9.3](https://github.com/purocean/yn/releases/tag/v2.9.3) 2021-06-04
1. 关闭全部标签时候，忽略固定的标签
2. 修正某些情况下标签排序不正确问题

### [v2.9.2](https://github.com/purocean/yn/releases/tag/v2.9.2) 2021-06-03
1. 新增固定标签页功能

### [v2.9.1](https://github.com/purocean/yn/releases/tag/v2.9.1) 2021-06-02
1. 新增脑图保留上次使用布局
2. 修正 macOS 更新升级错误问题

### [v2.9.0](https://github.com/purocean/yn/releases/tag/v2.9.0) 2021-05-29
1. 新增设置面板，更方便添加仓库
2. 微调部分控件的颜色和动画速度

### [v2.8.3](https://github.com/purocean/yn/releases/tag/v2.8.3) 2021-05-29
1. 修正长时间运行后静态文件不能访问问题
2. 修正应用选中文字颜色不正确问题
3. 应用增加编辑菜单，以支持 macOS 上的复制粘贴快捷键
4. 微调滚动条样式

### [v2.8.2](https://github.com/purocean/yn/releases/tag/v2.8.2) 2021-05-09
1. 修正快捷键判断问题
2. 升级 Electron 版本到 11.4.5

### [v2.8.1](https://github.com/purocean/yn/releases/tag/v2.8.1) 2021-04-28
1. 修正目录树菜单不正确问题
2. 修正状态栏菜单无子菜单不能点击问题

### [v2.8.0](https://github.com/purocean/yn/releases/tag/v2.8.0) 2021-04-27
1. 增加自定义插件功能
2. 微调窗口管理逻辑

### [v2.7.2](https://github.com/purocean/yn/releases/tag/v2.7.2) 2021-04-09
1. 优化 macOS 上的窗口体验

### [v2.7.1](https://github.com/purocean/yn/releases/tag/v2.7.1) 2021-04-08
1. 升级 Electron 到 11.4.2
2. 增加 Mac arm64 打包

### [v2.6.1](https://github.com/purocean/yn/releases/tag/v2.6.1) 2021-03-04
1. 修正一点界面问题
2. 调整 macOS 升级逻辑

### [v2.6.0](https://github.com/purocean/yn/releases/tag/v2.6.0) 2021-03-04
1. 内部功能插件化，增强拓展性
2. 微调界面样式
3. 修复复制代码快捷键不正确问题

### [v2.5.5](https://github.com/purocean/yn/releases/tag/v2.5.5) 2021-02-03
1. 调整预览文字选择颜色

### [v2.5.4](https://github.com/purocean/yn/releases/tag/v2.5.4) 2021-01-31
1. 调整 macOS 上应用边框样式
2. macOS 打包增加签名公证
3. 调整打包流程
4. 替换 plantuml 库

### [v2.5.1](https://github.com/purocean/yn/releases/tag/v2.5.1) 2021-01-17
1. 支持 macOS
2. 调整部分快捷键

### [v2.4.11](https://github.com/purocean/yn/releases/tag/v2.4.11) 2020-12-21
1. 修复不能导出 docx 问题
2. 修复大纲目录高度不正确

### [v2.4.10](https://github.com/purocean/yn/releases/tag/v2.4.10) 2020-12-16
1. 优化脑图使用体验

### [v2.4.9](https://github.com/purocean/yn/releases/tag/v2.4.9) 2020-12-15
1. 增加大纲列表脑图展示功能

### [v2.4.7](https://github.com/purocean/yn/releases/tag/v2.4.7) 2020-12-02
1. 修复编辑表格跨列单元格问题

### [v2.4.6](https://github.com/purocean/yn/releases/tag/v2.4.6) 2020-11-26
1. 增加编辑单元格内容功能

### [v2.4.5](https://github.com/purocean/yn/releases/tag/v2.4.5) 2020-11-26
1. 移除代码表格的悬停样式

### [v2.4.4](https://github.com/purocean/yn/releases/tag/v2.4.4) 2020-11-25
1. 更改 TOC 标号样式

### [v2.4.3](https://github.com/purocean/yn/releases/tag/v2.4.3) 2020-11-25
1. 表格新增悬停样式：行号，突出当前行

### [v2.4.2](https://github.com/purocean/yn/releases/tag/v2.4.2) 2020-11-20
1. 新增同步渲染按钮
2. 调整打印样式

### [v2.4.1](https://github.com/purocean/yn/releases/tag/v2.4.1) 2020-10-27
1. 在 Electron 环境中开启缩放页面功能

### [v2.4.0](https://github.com/purocean/yn/releases/tag/v2.4.0) 2020-10-26
1. Vue 框架升级到 3.0
2. 升级 Electron 版本
3. 升级前端依赖，更好的支持 Mermaid 图形

### [v2.3.8](https://github.com/purocean/yn/releases/tag/v2.3.8) 2020-09-01
1. 增加开机自动启动功能

### [v2.3.7](https://github.com/purocean/yn/releases/tag/v2.3.7) 2020-08-03
1. 优化预览鼠标事件响应

### [v2.3.6](https://github.com/purocean/yn/releases/tag/v2.3.6) 2020-06-30
1. 升级 Electron 到 9.0.5

### [v2.3.5](https://github.com/purocean/yn/releases/tag/v2.3.5) 2020-06-29
1. 增加脚注功能

### [v2.3.4](https://github.com/purocean/yn/releases/tag/v2.3.4) 2020-06-28
1. 优化图片相对链接解析
2. 优化转换外链图片为本地图片功能

### [v2.3.3](https://github.com/purocean/yn/releases/tag/v2.3.3) 2020-06-11
1. 修正标题过长导致大纲目录样式异常

### [v2.3.2](https://github.com/purocean/yn/releases/tag/v2.3.2) 2020-04-27
1. 调整启动命令行参数

### [v2.3.1](https://github.com/purocean/yn/releases/tag/v2.3.1) 2020-04-27
1. 增加配置监听端口命令行参数 `--port=8080`

### [v2.3.0](https://github.com/purocean/yn/releases/tag/v2.3.0) 2020-04-27
1. 增加启动命令行参数

### [v2.2.11](https://github.com/purocean/yn/releases/tag/v2.2.11) 2020-04-20
1. Drawio 文件渲染增加翻页按钮

### [v2.2.10](https://github.com/purocean/yn/releases/tag/v2.2.10) 2020-04-07
1. 新增粘贴图片为 Base64 形式快捷键 `Ctrl + B + V`
2. 更改粘贴富文本为 Markdown 快捷键为 `Ctrl + M + V`

### [v2.2.9](https://github.com/purocean/yn/releases/tag/v2.2.9) 2020-03-17
1. 修复公式解析问题

### [v2.2.8](https://github.com/purocean/yn/releases/tag/v2.2.8) 2020-03-13
1. 增加切换编辑器标签快捷键 `Ctrl + Alt + Left/Right`

### [v2.2.7](https://github.com/purocean/yn/releases/tag/v2.2.7) 2020-01-19
1. 调整渲染的表格宽度

### [v2.2.6](https://github.com/purocean/yn/releases/tag/v2.2.6) 2020-01-16
1. 修复插入文档名称问题

### [v2.2.5](https://github.com/purocean/yn/releases/tag/v2.2.5) 2020-01-14
1. 修复 frontend yarn.lock 问题

### [v2.2.4](https://github.com/purocean/yn/releases/tag/v2.2.4) 2020-01-14
1. 修复 frontend yarn.lock 问题

### [v2.2.3](https://github.com/purocean/yn/releases/tag/v2.2.3) 2020-01-13
1. 增加复制行内代码功能

### [v2.2.2](https://github.com/purocean/yn/releases/tag/v2.2.2) 2019-12-27
1. 修复快速打开面板小问题

### [v2.2.1](https://github.com/purocean/yn/releases/tag/v2.2.1) 2019-12-26
1. 修复跳转中文路径处理
1. 优化插入文档文件链接

### [v2.2.0](https://github.com/purocean/yn/releases/tag/v2.2.0) 2019-12-25
1. 增加文档之间跳转功能
1. 增加复制文档标题链接功能
1. 调整文档插入选择面板
1. 修复高分辨率下目录树箭头消失问题

### [v2.1.1](https://github.com/purocean/yn/releases/tag/v2.1.1) 2019-12-24
1. 增加在当前目录创建文件菜单
1. 限制快捷跳转列表数量以提高性能
1. 标题栏最大化窗口后移除尺寸调节

### [v2.1.0](https://github.com/purocean/yn/releases/tag/v2.1.0) 2019-11-29
1. 增加多标签同时打开多个文件

### [v2.0.2](https://github.com/purocean/yn/releases/tag/v2.0.2) 2019-11-21
1. 修复相对链接解析
1. 图片增加背景色便于透明图片的阅读

### [v2.0.1](https://github.com/purocean/yn/releases/tag/v2.0.1) 2019-11-20
1. 增加 2.0 计划
1. Electron 打包
1. 增加 HTML 小工具渲染
1. 增加特色功能说明和示例
1. 目录树自动定位文件
1. 目录树增加右键菜单
1. 目录树和集成终端增加拖动调整尺寸功能
1. 使用自定义 UI 控件代替浏览器阻塞性弹出框，优化界面样式，提升交互体验
1. 默认仓库数据和配置改为在 `<home>/yank-note` 下保存
1. 重构前端代码便于拓展
1. 前端重构文件接口

### [v1.23.0](https://github.com/purocean/yn/releases/tag/v1.23.0) 2019-07-09
1. 增加转换所有外链图片到本地功能 `Ctrl + Alt + L`

### [v1.22.0](https://github.com/purocean/yn/releases/tag/v1.22.0) 2019-05-20
1. 增加粘贴 html 富文本功能 `Ctrl + B + V`
1. 增加插入文档快捷键 `Ctrl + Alt + I`
1. 修复 vue cli 3 打包错误
1. 修复图片链接转义
1. 搜索排除 node_modules
1. 上传文件目录优化

### [v1.21.0](https://github.com/purocean/yn/releases/tag/v1.21.0) 2019-05-03
1. 调整抓取图片到本地的逻辑
1. 优化目录树样式
1. 目录树排除 node_modules
1. eslint 规则调整

### [v1.20.0](https://github.com/purocean/yn/releases/tag/v1.20.0) 2019-04-18
1. 无功能变化，前端使用 vue cli 3

### [v1.19.0](https://github.com/purocean/yn/releases/tag/v1.19.0) 2019-04-15
1. 增加终端打开目录功能 `Ctrl + Alt + 单击目录`
1. 增加刷新目录树功能 `Ctrl + Alt + 单击目录`

### [v1.18.2](https://github.com/purocean/yn/releases/tag/v1.18.2) 2019-03-21
1. 保存加密文件密码不一致时增加提示
1. 修复样式问题

### [v1.18.1](https://github.com/purocean/yn/releases/tag/v1.18.1) 2019-03-01
1. 修复目录样式
1. 修复代码块样式

### [v1.18.0](https://github.com/purocean/yn/releases/tag/v1.18.0) 2019-02-28
1. 代码块增加行号显示
1. 支持统一文档锚点跳转
1. 移除 `Mermaid` 支持
1. 优化打印样式
1. 优化行内代码样式

### [v1.17.0](https://github.com/purocean/yn/releases/tag/v1.17.0) 2019-02-20
1. 支持 `ECharts` 图形
1. `Ctrl + Alt + R` 在内置终端中运行选中代码

### [v1.16.2](https://github.com/purocean/yn/releases/tag/v1.16.2) 2019-02-18
1. 文件树增加操作说明
1. 新增/重命名文件后打开新文件

### [v1.16.1](https://github.com/purocean/yn/releases/tag/v1.16.1) 2019-02-17
1. 修复打印样式

### [v1.16.0](https://github.com/purocean/yn/releases/tag/v1.16.0) 2019-02-16
1. 增加 Readme 展示
1. 处理终端退出逻辑

### [v1.15.1](https://github.com/purocean/yn/releases/tag/v1.15.1) 2019-02-14
1. 更新 UI
1. 内置终端增加 windows 适配

### [v1.15.0](https://github.com/purocean/yn/releases/tag/v1.15.0) 2019-02-13
1. 增加内置终端
1. 运行代码支持在内置终端运行

### [v1.14.0](https://github.com/purocean/yn/releases/tag/v1.14.0) 2019-01-16
1. 上传附件增加日期
1. 快速跳转改用模糊搜索并高亮匹配项

### [v1.13.1](https://github.com/purocean/yn/releases/tag/v1.13.1) 2019-01-14
1. 修复 hr 标签样式

### [v1.13.0](https://github.com/purocean/yn/releases/tag/v1.13.0) 2019-01-05
1. 增加 toc
1. 增加返回顶部按钮

### [v1.12.0](https://github.com/purocean/yn/releases/tag/v1.12.0) 2019-01-03
1. 增加连接行快捷键 `Ctrl + J`
1. 增加转换大小写快捷键 `Ctrl + K, Ctrl + U` `Ctrl + K, Ctrl + L`

### [v1.11.0](https://github.com/purocean/yn/releases/tag/v1.11.0) 2019-01-02
1. 切换编辑器自动换行：`Alt + W` 或点击状态栏 `切换换行` 按钮

### [v1.10.0](https://github.com/purocean/yn/releases/tag/v1.10.0) 2018-12-24
1. 文件列表自然排序
1. 文件目录增加子项目数量显示

### [v1.9.0](https://github.com/purocean/yn/releases/tag/v1.9.0) 2018-11-12
1. 增加切换文档预览功能

### [v1.8.0](https://github.com/purocean/yn/releases/tag/v1.8.0) 2018-08-29
1. 增加在系统中打开文件/目录功能 `Ctrl + 双击文件/目录`

### [v1.6](https://github.com/purocean/yn/releases/tag/v1.6) 2018-08-22
1. 修复部分样式不和谐
1. 修复打开新文件编辑器滚动位置不正确
1. 增加将外链或 BASE64 图片转换为本地图片功能
1. 优化代码高亮在暗色主题下的展示
1. 渲染链接默认在新标签打开

### [v1.5.2](https://github.com/purocean/yn/releases/tag/v1.5.2) 2018-08-13
1. 优化输入数字列表体验
1. 增加直接插入回车和Tab的快捷键
1. 确保文件最后有空行
1. 文件跳转按照最近打开文件排序

### [v1.5.1](https://github.com/purocean/yn/releases/tag/v1.5.1) 2018-08-06
1. 修复打开上一次文件bug

### [v1.5](https://github.com/purocean/yn/releases/tag/v1.5) 2018-08-06
1. 增加状态栏
1. 添加多仓库支持

### [v1.4](https://github.com/purocean/yn/releases/tag/v1.4) 2018-08-02
1. 增加全文搜索功能
1. 修复公式定位问题

### [v1.3](https://github.com/purocean/yn/releases/tag/v1.3) 2018-08-02
1. 增加待办记录时间
1. 增加 bat 脚本运行
1. 优化使用体验

### [v1.2](https://github.com/purocean/yn/releases/tag/v1.2) 2018-07-30
1. 增加待办进度条展示

### [v1.1](https://github.com/purocean/yn/releases/tag/v1.1) 2018-07-29
1. 修复若干问题
1. 增加附件插入
1. 调整为暗色主题
1. 图片新标签预览
1. 增加文件筛选面板 Ctrl + p

</details>
