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
- **公式解析:** 支持输入 katex 公式代码
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

### [v3.77.1](https://github.com/purocean/yn/releases/tag/v3.77.1) 2024-11-24

[Windows](https://github.com/purocean/yn/releases/download/v3.77.1/Yank-Note-win-x64-3.77.1.exe) | [macOS arm64](https://github.com/purocean/yn/releases/download/v3.77.1/Yank-Note-mac-arm64-3.77.1.dmg) | [macOS x64](https://github.com/purocean/yn/releases/download/v3.77.1/Yank-Note-mac-x64-3.77.1.dmg) | [Linux AppImage](https://github.com/purocean/yn/releases/download/v3.77.1/Yank-Note-linux-x86_64-3.77.1.AppImage) | [Linux deb](https://github.com/purocean/yn/releases/download/v3.77.1/Yank-Note-linux-amd64-3.77.1.deb)

1. feat: 增加仓库索引机制，增加查看文档反向链接功能
2. feat: 上传图片时候自动重命名重名的图片
3. feat: 下载网络图片尽量保持原文件名
4. feat: PicGo 上传图片支持远程模式，api 接口地址如果包含 `key` 参数则认为是远程模式
5. feat: 支持从操作系统中拖拽复制文件到仓库中
6. feat: 优化文本片段对选中文本的处理
7. feat: 增加“启用触发建议灯泡”配置
8. feat: 优化打开大仓库时候目录树性能
9. fix: 修复编辑器关闭有序列表序号自动补全时仍然自动添加序号问题
10. fix: 修复 Windows 上通过托盘菜单可能不能打开设置面板问题
11. fix: 修复 PlantUML 图像缓存加载异常问题
12. fix: 修复不能在“弹出预览”窗口中显示 `file://` 协议图片问题
13. fix: 修复读取断开的符号链接文件导致的错误问题
14. fix: 修复导出 PDF 设置缩放比例不生效问题
15. fix: 修复打开仓库外文件自动补全路径计算问题
16. plugin: 增加 `VIEW_BEFORE_RENDER` 钩子
17. plugin: 增加 `ctx.repo` 模块
18. plugin: 增加 `ctx.indexer` 模块

[更多发布说明](https://github.com/purocean/yn/releases)

## 支持

加我微信进交流群（备注 Yank Note）

<img src="./help/qrcode-wechat.jpg" width="150">
