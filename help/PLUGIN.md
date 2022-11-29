---
headingNumber: true
---

# Plug-In Development Guide

English | [中文](./PLUGIN_ZH-CN.md)

[toc]{type: "ol"}

## Preface

Yank Note is a open source, completely **hackable** note application.

My vision is to allow users to customize their own editor according to their own ideas, so that this editor can better assist users in their work and study. For example, for the scenario of [Git Submit](https://github.com/purocean/yn/issues/65#issuecomment-962472562), users can write their own plug-ins to implement this function without waiting for developers to adapt.

At now, almost all functions inside Yank Note are implemented through a thin plug-in system ([dozens of built-in plug-ins](https://github.com/purocean/yn/tree/develop/src/renderer/plugins)). The capabilities used by the built-in plug-ins are exactly the same as the plug-ins written by users, and you can even use some third-party libraries used by Yank Note in the plug-ins.

## Write A Plug-In

1. Right click the tray icon and click "Open Main Dir"
2. Create a new file `plugin-hello.js` in `<main directory>/plugins`
3. Edit the `plugin-hello.js` file and write the following content.
    ```js
    // register a plug-in
    window.registerPlugin({
        name: 'plugin-hello',
        register: ctx => {
            // add menu on status bar
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
4. Right-click the tray icon and click "Develop > Reload"

Now you can see the "HELLO" menu in the status bar expectantly.

## Core Concepts

Yank Note has some concepts that are the basis for supporting the entire plug-in system：

1. Hook
1. Action

### Hook

When Yank Note performs some operations, it will trigger some hook calls.

Use [`ctx.registerHook`](https://yn-api-doc.vercel.app/modules/renderer_core_hook.html#registerHook) to register a hook processing method.

Use [`ctx.triggerHook`](https://yn-api-doc.vercel.app/modules/renderer_core_hook.html#triggerHook) to trigger a hook.

The option `{ breakable: true }` is appended when calling `triggerHook`, indicating that the hook call is breakable.

The following internal hook call is breakable:

- `ACTION_AFTER_RUN`
- `ACTION_BEFORE_RUN`
- `TREE_NODE_SELECT`
- `VIEW_ELEMENT_CLICK`
- `VIEW_ELEMENT_DBCLICK`
- `VIEW_KEY_DOWN`
- `EDITOR_PASTE_IMAGE`

Breakable hook processing methods need to have a return value `Promise<boolean> | boolean`. When the hook processing method returns `true`, the subsequent hooks will no longer run。

For internal hook types, please refer to [Api Document](https://yn-api-doc.vercel.app/modules/renderer_types.html#BuildInHookTypes)

### Action

Yank Note has an Action Center [`ctx.action`](https://yn-api-doc.vercel.app/modules/renderer_core_action.html), which provides action and keyboard shortcuts management and operation。

For internal action, please refer to [Api Document](https://yn-api-doc.vercel.app/modules/renderer_types.html#BuildInActions)

## Plug-In Capabilities

As you can see from the above, the functions of the plug-in are all implemented through the modules of `ctx`.

In addition to the above core modules, there are many other modules under ctx, which basically cover all aspects of the editor.

Run the following code, you can see which modules are available of `ctx`.

```js
// --run--
console.log(Object.keys(ctx).join('\n'))
```

Refer to [Api Document](https://yn-api-doc.vercel.app/modules/renderer_context.html) to get more instructions.

## Distribute Plugins

If you want to distribute your own plugins/themes to others, please refer to https://github.com/purocean/yank-note-extension#readme

## More

In general, Yank Note encourages users to create their own work-learning tools that only need a few lines of code to help their work and study.

In addition, if you only need to create some handy tools, you don't need to write plug-ins, you can use [RunCode](FEATURES.md#RunCode) function or write [Widgets](FEATURES.md#Widgets) to achieve. The ability to run js code here is also completely open, and the global variable `ctx` also has all the above functions.

For example, run js code:

```js
// --run--
ctx.ui.useToast().show("info", "HELLOWORLD!")
console.log("hello world!")
```

Widgets

```html
<!-- --applet-- -->
<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">HELLO</button>
```
