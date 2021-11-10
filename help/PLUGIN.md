---
headingNumber: true
---

# 插件开发指南

[toc]{type: "ol"}

## 前言

Yank Note 是一个完全开放，Hackable 的笔记应用。

我的理想是让用户可以按照自己的想法来定制自己的编辑器，让这款编辑器可以更好的辅助用户的工作和学习。比如针对 [Git 提交](https://github.com/purocean/yn/issues/65#issuecomment-962472562) 的这个场景，用户就可以自己编写插件来实现这个功能，不用等到开发者来适配。

目前，Yank Note 内部几乎所有功能功能，均是通过一套薄薄的插件体系来实现（[几十个内置插件](https://github.com/purocean/yn/tree/develop/src/renderer/plugins)）。内置插件所用到的能力，和用户编写的插件完全一致，甚至你可以在插件中使用一些 Yank Note 使用的第三方库。

## 编写一个插件

1. 右键点击托盘图标，点击“打开主目录”
2. 在 `<主目录>/plugins` 中新建一个 `plugin-hello.js` 文件
3. 编辑 `plugin-hello.js` 文件，写入如下内容。
    ```js
    // 注册一个插件
    window.registerPlugin({
        name: 'plugin-hello',
        register: ctx => {
            // 添加状态栏菜单
            ctx.statusBar.tapMenus(menus => {
                menus['plugin-hello'] = {
                    id: 'plugin-hello',
                    position: 'left',
                    title: 'HELLO',
                    onClick: () => {
                        ctx.ui.useToast().show('info', 'HELLO WORLD!');
                    }
                }
            })
        }
    });
    ```
4. 右键点击托盘图标，点击“开发 > 重载页面”

现在应该可以在状态栏看到 “HELLO” 菜单了。

## 核心概念

Yank Note 有一些概念，是支撑整个插件体系的基础：

1. Hook 钩子
1. Action 动作
1. Command 命令

### Hook 钩子

Yank Note 在执行一些操作的时候，会触发一些钩子调用。

使用 [`ctx.registerHook`](https://yn-api-doc.vercel.app/modules/core_plugin.html#registerHook) 可以注册一个钩子处理方法。使用 [`ctx.triggerHook`](https://yn-api-doc.vercel.app/modules/core_plugin.html#triggerHook) 则可以触发一个钩子。

调用 `triggerHook` 时候附加选项 `{ breakable: true }`，表明这个钩子调用是可中断的。

下面的内部钩子调用是可中断的

- `ACTION_AFTER_RUN`
- `ACTION_BEFORE_RUN`
- `TREE_NODE_SELECT`
- `VIEW_ELEMENT_CLICK`
- `VIEW_ELEMENT_DBCLICK`
- `VIEW_KEY_DOWN`
- `EDITOR_PASTE_IMAGE`

可中断的钩子处理方法需要有返回值 `Promise<boolean> | boolean`。当钩子处理方法返回 `true`，则后续的钩子不再运行。

内部的钩子类型可以参考 [Api 文档](https://yn-api-doc.vercel.app/modules/types.html#BuildInHookTypes)

### Action 动作

Yank Note 有一个 Action 中心 [`ctx.action`](https://yn-api-doc.vercel.app/modules/core_action.html)，提供动作的管理和运行。

内部 Action 可以参考 [Api 文档](https://yn-api-doc.vercel.app/modules/types.html#BuildInActions)

### Command 命令

Yank Note 有一个 Command 中心 [`ctx.command`](https://yn-api-doc.vercel.app/modules/core_command.html)，主要负责快捷键相关的管理和运行。

## 插件能力

从上面可以看到，插件的功能都是通过 `ctx` 下面挂载的模块来实现。

除了上述核心的几个模块，ctx 下面还有很多其他模块，基本涵盖了编辑器的各个方面。

运行下面的代码，你可以看到 `ctx` 下都有哪些模块可供使用。

```js
// --run--
console.log(Object.keys(ctx).join('\n'))
```

参考 [Api 文档](https://yn-api-doc.vercel.app/modules/context.html) 获得更多使用说明。

## 更多

总体来说，Yank Note 鼓励用户打造自己的工作学习工具，只需要几行代码，即可给自己的工作学习助力。

另外，如果您只需要打造一些趁手的工具，可以不用编写插件，可以使用[代码运行](FEATURES.md#运行代码)功能或者编写 [小工具](FEATURES.md#小工具)来实现。这里的 js 代码运行能力也是完全开放，全局变量 `ctx` 也具有上述所有的功能。

例如运行代码功能：

```js
// --run--
ctx.ui.useToast().show("info", "HELLOWORLD!")
console.log("hello world!")
```

小工具

```html
<!-- --applet-- -->
<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">HELLO</button>
```
