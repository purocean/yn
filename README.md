# Yank Note Markdown 编辑器
> 一款面向程序员的 Markdown 编辑器

[toc]{level: [2]}

![截图](./0.png)

## 特色
+ 使用方便：使用 Monaco 编辑器（vscode 编辑器内核）编辑，添加了针对 Markdown 文件加入快捷键和补全规则
+ 归档方便：图片文件保存在本地，无元数据文件或其他数据库，Markdown 文件可简单处理离线工作
+ 拓展性强：可在文档中嵌入小工具、可运行的代码块、ECharts 图形、Plantuml 图形等
+ 支持加密：用来保存账号等隐私文件，文件可单独设置密码

## 注意事项
+ Yank Note 是一款**针对程序员**的 Markdown 编辑器，目标应用场景为在本机写文章，日志，笔记，小工具。
+ Yank Note 为了更高的拓展性和方便性，牺牲了安全防护（命令执行，文件读写）。如果要用 Yank Note 打开外来 Markdown 文件，**请务必仔细甄别文件内容是值得信任的**。
+ 如果要改造为对外的 Web 服务，本工具可能不太适合。或者请运行在可隔离控制的环境下。

## Yank-Note 2.0 开发计划
[V2 项目看板](https://github.com/purocean/yn/projects/2)

+ [x] 项目更名为 **Yank-Note**
+ [x] 前端界面可以拖动调整尺寸
+ [x] 重构前端项目结构，便于拓展：引入 `vuex`，使用 `async await` 代替可怕的回调，规范文件接口
+ [x] 暴露 Api 接口可以在文档中嵌入轻量应用，以便构建一些小工具
+ [x] 使用 `Electron` 构建为桌面应用。不追求完全做成客户端，还是可以沿用 CS 架构。同样可以在浏览器中使用
+ [ ] 支持嵌入 `draw.io` 文档
+ [ ] 文件目录增加右键菜单
+ [ ] 支持打开多个文件
+ [ ] 常驻托盘，支持使用快捷键打开常用文档
+ [ ] 拥有更友好的配置界面
+ [ ] 可以自定义快捷键
+ [ ] 可以使用 `WebDAV` 协议作为文件通信协议

## 上手使用
+ 在 [最新版本](https://github.com/purocean/yn/releases) 下载对应平台应用即可
+ 新增文件：`双击目录`
+ 在系统中打开文件/目录：`Ctrl ＋ 单击文件/目录`
+ 删除文件/目录：`Shift + 右键文件/目录`
+ 重命名文件/目录：`Ctrl + 右键文件/目录`
+ 切换文档预览显示：`Alt + V` 或点击状态栏 `切换预览` 按钮
+ 切换编辑器自动换行：`Alt + W` 或点击状态栏 `切换换行` 按钮
+ 切换内置终端展示：`Alt + O` 或点击状态栏 `切换终端` 按钮
+ 切换内置终端工作目录到当前目录 `Ctrl + Alt + 单击目录`
+ 刷新目录树 `双击目录空白区域`
+ 将外链或 BASE64 图片转换为本地图片：`Ctrl + Shift + 单击图片` `Ctrl + Alt + L` 转换所有外链图片到本地
+ 默认快捷键参考 [vscode](https://code.visualstudio.com/)
    + `Ctrl + X` 剪切所选/当前行
    + `Ctrl + C` 复制所选/当前行
    + `Ctrl + Z` 撤消
    + `Ctrl + Shift + Z` 反撤消
    + `Ctrl + /` 注释行
    + `Ctrl + Shift + A` 注释段
    + `Ctrl + K, Ctrl + X` 删除尾部空格
    + `Alt + Click` 插入光标
    + `Shift + Alt + ↑/↓` 在相邻行插入光标
    + `Ctrl + U` 取消最后添加的光标
    + `Shift + Alt + I` 在选中区的所有行的最后添加光标
    + `Ctrl + D` 为下一个匹配项添加光标
    + `Ctrl + F` 查找
    + `Ctrl + H` 替换
+ 自定义编辑器快捷键
    + `Ctrl + P` 打开文件快速跳转面板
    + `Ctrl + S` 保存文档
    + `Ctrl + Enter` 强制插入新行，忽略预置补全规则
    + `Shift + Enter` 强制插入 Tab，忽略预置补全规则
    + `Ctrl + Shift + Up` 当前行上移
    + `Ctrl + Shift + Down` 当前行下移
    + `Ctrl + Shift + D` 重复当前行
    + `Ctrl + Alt + D` 插入当前日期
    + `Ctrl + Alt + T` 插入当前时间
    + `Ctrl + Alt + F` 插入文件附件
    + `Ctrl + Alt + I` 插入文档链接
    + `Ctrl + J` 连接行 join lines
    + `Ctrl + K, Ctrl + U` 转换大写
    + `Ctrl + K, Ctrl + L` 转换小写
    + `Ctrl + Alt + R` 在内置终端里面运行选中内容
    + `Ctrl + B + V` 粘贴 html 富文本

## 特色功能
+ 同步预览滚动，实现得较粗糙
+ 目录大纲展示
+ 文件加密：以 `.c.md` 结尾的文件视为加密文件
+ 自动保存（加密文档不自动保存）
+ 列表自动补全
+ 粘贴剪切板里面的图片
+ 添加附件到文档
+ 运行 PHP，nodejs，Python，bash 代码，**代码块第一行需要包含以 `--run--` 字符串，示例见下面截图，当然需要安装相关环境**
+ 文档支持内嵌 HTML 小工具，**HTMl代码块第一行需要包含以 `--applet--` 字符串，其余字符串作为小工具标题，示例见下面截图**
+ 开启了 HTML 解析，可以直接在文档里面使用 HTML 代码
+ 待办进度条
+ 快速跳转文件，全文搜索文件内容
+ 多仓库切换
+ 生成 TOC 在需要生成目录的地方写入 `[toc]{type: "ol", level: [1,2,3]}` 即可
+ docx 格式导出，**需要安装 [pandoc](https://pandoc.org/)**
+ ECharts 图形支持 [ECharts](https://echarts.baidu.com/) **Js 代码块第一行需要包含以 `--echarts--` 字符串，示例见下面截图**
+ markdown 编辑器 [monaco-editor](https://github.com/Microsoft/monaco-editor)
+ markdown 解析 [markdown-it](https://github.com/markdown-it/markdown-it)
+ GitHub 风格样式和特性 [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
+ 待办列表 [GitHub-style task lists](https://github.com/revin/markdown-it-task-lists)
+ Plantuml 图形，**需要安装 Java，graphviz [markdown-it-plantuml](https://github.com/gmunguia/markdown-it-plantuml)**
+ katex 公式解析 [markdown-it-katex](https://github.com/waylonflinn/markdown-it-katex)
+ 元素属性书写 [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs)
+ 表格解析增强，支持表格标题多行文本，列表等特性 [markdown-it-multimd-table](https://github.com/RedBug312/markdown-it-multimd-table)
+ 内置终端 [XTERM.JS](https://xtermjs.org/) [node-pty](https://github.com/Microsoft/node-pty)

## 开发
依赖安装和编译比较麻烦，请保证自己有足够耐心且有科学上网的手段。

### Windows
Windows 上安装 node-pty 需要费一番功夫，请参考 https://github.com/microsoft/node-pty#windows 配置编译环境。

```bat
REM Node 版本要求 12 v12.7.0
node -v

REM 前端
cd frontend
REM 安装依赖
yarn
REM 打包
yarn run dist
REM 开发
yarn run serve

REM Electron 端
cd ../app
REM 安装依赖
win-install.bat
REM 打包 打包前请在前端目录运行打包命令
win-build.bat
REM 开发
yarn run start
```

### Liunx
    TODO 手头没有环境，待完善

### OSX
    TODO 手头没有环境，待完善

## 捐赠
如果我的工作对您有帮助，请我喝杯咖啡吧 ^_^。**附言可以留下您的 github 用户名或网站连接**。

<img alt="微信" src="./wechat.png" width="17%" style="display: inline-block">　<img alt="支付宝" src="./alipay.jpg" width="17%" style="display: inline-block">　<img alt="支付宝红包" src="./hb.jpg" width="17%" style="display: inline-block">

1. [wangyedong66](https://github.com/wangyedong66) 2元
1. [yubingcen](https://github.com/yubingcen) 0.1元

## 界面截图
![截图](./1.png)
![截图](./2.png)
![截图](./3.png)
![截图](./4.gif)

## 更新日志
[最新发布](https://github.com/purocean/yn/releases)

### [v2.0.0-beta2](https://github.com/purocean/yn/releases/tag/v2.0.0-beta2) 2019-08-07
1. 应用单例
1. 自动构建

### [v2.0.0-beta1](https://github.com/purocean/yn/releases/tag/v2.0.0-beta1) 2019-08-07
1. Electron 打包
1. 修复若干问题

### [v2.0.0-alpha5](https://github.com/purocean/yn/releases/tag/v2.0.0-alpha5) 2019-08-05
1. 小工具全局注入 dayjs
1. 在系统中打开快捷键改用 `Ctrl + 单击`
1. 修复帮助接口图片加载
1. 增加 HTML 小工具渲染
1. 修复快速打开文件不能搜索内容

### [v2.0.0-alpha4](https://github.com/purocean/yn/releases/tag/v2.0.0-alpha4) 2019-08-03
1. 增加特色功能说明和示例
1. 增加 HTML 小工具渲染
1. 目录树自动定位文件

### [v2.0.0-alpha3](https://github.com/purocean/yn/releases/tag/v2.0.0-alpha3) 2019-08-02
1. 优化界面样式，提升交互体验
1. 修复若干 v2.0.0-alpha2 的问题

### [v2.0.0-alpha2](https://github.com/purocean/yn/releases/tag/v2.0.0-alpha2) 2019-08-02
1. 默认仓库数据和配置改为在 `<home>/yank-note` 下保存
1. 调整在 Windows 端的仓库配置，不论是否在 WSL 环境下都使用 windows 风格的路径
1. 前端重构文件接口
1. 尝试引入 Electron
1. 后端重构改用 TypeScript
1. 修复若干 v2.0.0-alpha1 的问题

### [v2.0.0-alpha1](https://github.com/purocean/yn/releases/tag/v2.0.0-alpha1) 2019-08-01
1. 目录树和集成终端增加拖动调整尺寸功能
1. 重构前端代码便于拓展
1. 使用自定义 UI 控件代替浏览器阻塞性弹出框
1. 增加 2.0 计划

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
