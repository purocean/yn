# Yank Note

A **hackable** markdown note application for programmers **[Download](https://github.com/purocean/yn/releases)** | **[Try it Online >>>](https://yank-note.vercel.app/)**

[![Download](./help/mas_en.svg?.inline)](https://apps.apple.com/cn/app/yank-note/id1551528618)

English | [中文说明](./README_ZH-CN.md)

[toc]{level: [2]}

![Screenshot](./help/1.png)

## Highlights

- **Easy to use:** Use *Monaco* kernel, optimize for Markdown editing, and have the same editing experience as VSCode.
- **Powerful:** Applets, runnable code blocks, tables, Plantuml, Drawio, macro replacements, etc., can be embedded in the document.
- **High compatibility:** Data is saved as local Markdown files, and the extension functions are implemented in the original syntax of Markdown as far as possible.
- **Plug-in extension:** Support users to write their own plug-ins to expand the functionality of the editor.
- **Encryption supported:** Use encryption to save private files such as account number, and the password can be set separately for each file.

## Attention

- For more extendable, Yank Note sacrifices security protection (command execution, arbitrary file reading and writing). If you want to use it to open a foreign Markdown file, ⚠️**be sure to carefully identify whether the content of the file is trustworthy**⚠️.
- The encryption and decryption of encrypted files are both completed at the front end. Please **be sure to remember your password**. Once the password is lost, it can only be cracked violently.

## Yank-Note V3 Plan

The core goal of V3 is to refactor the code to improve application robustness, expansibility, and Markdown rendering performance.

[V3 Project Board](https://github.com/purocean/yn/projects/5)

- [x] Build with Vite
- [x] Optimize the performance of Markdown rendering, and support the extension of Vue component mode
- [x] Refactor Electron code
- [x] Refactor business logic, and decouple components
- [x] Improve the documentation of custom plug-in
- [ ] Enhance document retrieval and citation experience
- [ ] Refactor the shortcut key processing layer, and support custom shortcut keys
- [ ] Other unfinished functions of V2
- [ ] Add mobile application

## Characteristic functions

For more information on how to use the following functions, please see [characteristic functions description](./help/FEATURES.md)

- **Sync scrolling:** the editing area and the preview area scroll synchronously, and the preview area can be scrolled independently
- **Outline:** quickly jump to the corresponding location of the document through the directory outline in the preview area
- **Encryption:** files ending with `.c.md` are treated as encrypted files
- **Auto-save:** automatically save files after editing, with orange title bar reminder for unsaved files (encrypted documents are not automatically saved)
- **Editing:** automatic completion of list
- **Paste images:** you can quickly paste pictures from the clipboard and insert them as files or Base64
- **Embed attachments:** you can add attachments to the document and click to open them in the operating system.
- **Code running:** support to run JavaScript, PHP, nodejs, Python, bash code
- **To-do list:** support to display the to-do progress in the document. Click to quickly switch the to-do status.
- **Quickly Open:** you can use shortcut key to open the file switch panel to quickly open files, tagged files, and full-text search for file contents.
- **Integrated terminal:** support to open the terminal in the editor to quickly switch the current working directory
- **Katex:** support katex expression
- **Style:** Markdown uses GitHub styles and features
- **Repository:** multiple data locations can be defined for document classification
- **External link conversion:** convert external link or Base64 pictures into local pictures
- HTML resolving：you can use HTML code directly in the document, or use shortcut keys to copy and paste HTML to Markdown
- **Multiple formats export:** the backend uses pandoc as converter
- **TOC:** write `[toc]{type:** "ol", level:** [1,2,3]}` to generate TOC where you need to generate a directory
- **Edit table cell:** double-click a table cell to quickly edit
- **Copy title link:** copy title link path to the clipboard for easy insertion into other files
- **Embedded Applets:** document supports embedded HTML Applets
- **Embed Plantuml graphics:** you need to install Java and graphviz
- **Embed drawio graphics:** document supports embedded drawio graphics
- **Embed ECharts graphics:** document supports embeded Echarts graphics
- **Embed Mermaid graphics:** document supports embeded Mermaid graphics
- **Embed Luckysheet tables:** document supports embeded Luckysheet tables
- **Mind map:** nested list can be displayed in the form of a mind map
- **Element attribute writing:** any attribute of an element can be customized
- **Table enhancement:** support table title with multiple lines of text, list and other features
- **Document link:** support to link other documents in the document and jump to each other
- **Footnote:** support writing footnotes in the document
- **Custom container:** support custom containers similar to VuePress default themes
- **Macro replacement:** support for embedded JavaScript expressions to dynamically replace document content
- **Image hosting service:** support [PicGo](https://picgo.github.io/PicGo-Doc/) image hosting service
- **Custom plug-ins:** support writing JavaScript plug-ins to expand editor functionality. The plug-in is placed in the `home directory/plugins`. Refer to [plug-in Development Guide](./help/PLUGIN.md)

## Screenshots

![Screenshot](./help/2.png)
![Screenshot](./help/3.png)
![Screenshot](./help/4.png)
![Screenshot](./help/5.png)

## Changelogs

### [v3.17.0](https://github.com/purocean/yn/releases/tag/v3.17.0) 2021-12-24
1. feat: add rich text copy
2. feat: add HTML copy
3. upd: optimize editor completion
4. upd: optimize the export function
5. upd: upgrade Electron to 15.3.2
6. upd: upgrade Monaco editor to 0.31.1
7. upd: optimize window user experience of macOS
8. fix: fix the problem that files cannot be displayed in Explorer on Windows
9. fix: fix the problem of text flickering when using the input method
10. fix: fix the problem of label jumping when editing container block content
11. feat: add `ctx.utils.downloadContent` method
12. feat: add `ctx.ui.useModal().alert` method
13. feat: add `ctx.api.convertFile` method
14. feat: add `ctx.base.readFromClipboard` method
15. feat: add `ctx.base.writeToClipboard` method
16. feat: add `ctx.view.getPreviewStyles` method
17. feat: add `ctx.view.getPreviewStyles` method
18. feat: add `ctx.lib.turndown` library
19. feat: add `ctx.lib.juice` library
20. upd: add `options` parameter for `ctx.view.getContentHtml`

[More release notes](https://github.com/purocean/yn/releases)

## Supports

Wechat Group

<img src="./help/qrcode-wechat.jpg?.inline" width="150">
