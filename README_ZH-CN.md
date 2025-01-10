# Yank Note

一款**强大可扩展**的 Markdown 编辑器，为生产力而生。**[全平台下载](https://github.com/purocean/yn/releases)** ｜ **[在线体验>>>](https://demo.yank-note.com/)**

[![Download](./help/mas_en.svg?.inline)](https://apps.apple.com/cn/app/yank-note/id1551528618) [Mac App Store 版本说明](https://github.com/purocean/yn/issues/65#issuecomment-1065799677)

[English](./README.md) | 中文说明 | [Русский](./README_RU.md)

[toc]{level: [2]}

![截图](./help/1_ZH-CN.png)

## 特色

- **使用方便**：使用 Monaco 内核，专为 Markdown 优化，拥有和 VSCode 一样的编辑体验。
- **功能强大**：支持历史版本回溯；可在文档中嵌入小工具、可运行的代码块、表格、PlantUML 图形、Drawio 图形、宏替换等；支持接入 [OpenAI](https://openai.com) 自动补全。
- **兼容性强**：数据保存为本地 Markdown 文件；拓展功能尽量用 Markdown 原有的语法实现。
- **插件拓展**：支持用户编写自己的插件来拓展编辑器的功能。
- **支持加密**：用来保存账号等隐私文件，文件可单独设置密码。

## 注意事项

- 为了更高的拓展性和方便性，Yank Note 牺牲了安全防护（命令执行，任意文件读写）。如果要用它打开外来 Markdown 文件，⚠️**请务必仔细甄别文件内容是值得信任的**⚠️。
- 加密文件的加密解密操作均在前端完成，请**务必牢记自己的密码**。一旦密码丢失，就只能暴力破解了。

## 特色功能

以下功能具体使用可参考[特色功能说明](./help/FEATURES_ZH-CN.md)

- **同步滚动:** 编辑区和预览区同步滚动，预览区可独立滚动
- **目录大纲:** 预览区目录大纲快速跳转
- **版本管理:** 支持回溯文档历史版本
- **文件加密:** 以 `.c.md` 结尾的文件视为加密文件
- **自动保存:** 文件编辑后自动保存，未保存文件橙色标题栏提醒（加密文档不自动保存）
- **编辑优化:** 列表自动补全
- **粘贴图片:** 可快速粘贴剪切板里面的图片，可作为文件或 Base64 形式插入
- **嵌入附件:** 可以添加附件到文档，点击在系统中打开
- **代码运行:** 支持运行 JavaScript、PHP、nodejs、Python、bash 代码
- **待办列表:** 支持显示文档中的待办进度，点击可快速切换待办状态
- **快速打开:** 可使用快捷键打开文件切换面板，以便快捷打开文件，标记的文件，全文搜索文件内容
- **内置终端:** 支持在编辑器打开终端，快速切换当前工作目录
- **公式解析:** 支持输入 LaTeX 公式代码
- **样式风格:** Markdown 使用 GitHub 风格样式和特性
- **数据仓库:** 可定义多个数据位置以便文档分类
- **外链转换:** 将外链或 BASE64 图片转换为本地图片
- **HTML 解析:** 可以直接在文档里面使用 HTML 代码，也可以使用快捷键粘贴复制 HTML 为 Markdown
- **docx 导出:** 后端使用 pandoc 做转换器
- **TOC 支持:** 生成 TOC 在需要生成目录的地方写入 `[toc]{type: "ol", level: [1,2,3]}` 即可
- **编辑表格单元格:** 双击表格单元格即可快速编辑
- **复制标题链接:** 复制标题链接路径到剪切板，便于插入到其他文件
- **嵌入小工具:** 文档支持内嵌 HTML 小工具
- **嵌入 PlantUML 图形:** 在文档内内嵌 PlantUML 图形
- **嵌入 drawio 图形:** 在文档中内嵌 drawio 图形
- **嵌入 ECharts 图形:** 在文档中嵌入 Echarts 图形
- **嵌入 Mermaid 图形:** 在文档中嵌入 Mermaid 图形
- **嵌入 Luckysheet 表格:** 在文档中嵌入 Luckysheet 表格
- **嵌套列表转脑图展示:** 可将嵌套列表用脑图的方式展示
- **元素属性书写:** 可自定义元素的任意属性
- **表格解析增强:** 表格支持表格标题多行文本，列表等特性
- **文档交叉链接跳转:** 支持在文档中链接其他文档，互相跳转
- **脚注功能:** 支持在文档中书写脚注
- **容器块:** 支持类似 VuePress 默认主题的自定义容器
- **宏替换:** 支持内嵌 JavaScript 表达式动态替换文档内容
- **图床:** 支持 [PicGo](https://picgo.github.io/PicGo-Doc/) 图床
- **OpenAI:** 支持接入 [OpenAI](https://openai.com) 自动补全
- **自定义插件:** 支持编写 JavaScript 插件拓展编辑器功能。插件放置在 `主目录/plugins` 中。参考[插件开发指南](./help/PLUGIN_ZH-CN.md)

## 截图

![截图](./help/6_ZH-CN.png)
![截图](./help/7_ZH-CN.png)
![截图](./help/2_ZH-CN.png)
![截图](./help/3_ZH-CN.png)
![截图](./help/4_ZH-CN.png)
![截图](./help/5_ZH-CN.png)

## 更新日志

### [v3.80.1](https://github.com/purocean/yn/releases/tag/v3.80.1) 2025-01-10

[Windows](https://github.com/purocean/yn/releases/download/v3.80.1/Yank-Note-win-x64-3.80.1.exe) | [macOS arm64](https://github.com/purocean/yn/releases/download/v3.80.1/Yank-Note-mac-arm64-3.80.1.dmg) | [macOS x64](https://github.com/purocean/yn/releases/download/v3.80.1/Yank-Note-mac-x64-3.80.1.dmg) | [Linux AppImage](https://github.com/purocean/yn/releases/download/v3.80.1/Yank-Note-linux-x86_64-3.80.1.AppImage) | [Linux deb](https://github.com/purocean/yn/releases/download/v3.80.1/Yank-Note-linux-amd64-3.80.1.deb)

1. feat: 增加仓库搜索并全部替换功能
2. feat: 增加文本对比工具（需安装扩展）
3. feat: 优化仓库搜索结果展示性能，搜索结果可设置到 2000 个结果
4. feat: 优化文件选项卡、状态栏菜单、编辑器状态保存恢复等若干交互细节
5. feat: 优化快速跳转文件筛选输入模糊匹配算法
6. feat: 大幅度优化运行 JS 代码日志吞吐性能
7. feat: Wiki 链接支持跳转到非 Md 文件
8. feat: 宏替换 `$include` 支持引入纯文本文件（不限于 Md 文件）
9. feat: 文档历史 Diff 编辑器折叠未改动部分
10. fix: 修复切换预览器/编辑器菜单 UI 问题
11. fix: 修复文档历史 Diff 编辑器同主编辑器可能干扰问题
12. fix(plugin): 修复 `ctx.i18n.createI18n` 生成的 Vue ref 对象可能不响应语言变化问题
13. feat(plugin): 增加 `ctx.whenExtensionInitialized` 方法，插件初始化完成后执行回调
14. feat(plugin): 增加 `ctx.routines.chooseDocument` 方法，用以选择文档
15. feat(plugin): 增加 `ctx.doc.cloneDoc` 方法，用以克隆文档对象基本信息
16. feat(plugin): 增加 `ctx.doc.isPlain` 方法，用以判断文档是否为纯文本文档
17. feat(plugin): 增加 `ctx.editor.getAvailableCustomEditors` 方法，用以获取文档可用的自定义编辑器
18. feat(plugin): 增加 `ctx.repo.isNormalRepo` 方法，用以判断仓库是否为普通仓库

[更多发布说明](https://github.com/purocean/yn/releases)

## 支持

加我微信进交流群（备注 Yank Note）

<img src="./help/qrcode-wechat.jpg" width="150">
