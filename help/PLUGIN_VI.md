---
headingNumber: true
---

# Hướng dẫn phát triển plugin

[English](./PLUGIN.md) | [中文](./PLUGIN_ZH-CN.md) | Tiếng Việt

[toc]{type: "ol"}

## Lời nói đầu

Yank Note là một ứng dụng ghi chú mã nguồn mở, có thể **tùy biến (hack)** hoàn toàn.

Mong muốn của tôi là để người dùng tự tùy chỉnh trình soạn thảo theo ý tưởng của riêng mình, giúp trình soạn thảo hỗ trợ công việc và học tập tốt hơn. Ví dụ, với tình huống [Git Submit](https://github.com/purocean/yn/issues/65#issuecomment-962472562), người dùng có thể tự viết plugin để hiện thực chức năng này mà không cần chờ nhà phát triển hỗ trợ.

Hiện nay, gần như mọi chức năng bên trong Yank Note đều được hiện thực thông qua một hệ thống plugin mỏng ([hàng chục plugin tích hợp sẵn](https://github.com/purocean/yn/tree/develop/src/renderer/plugins)). Các khả năng mà plugin tích hợp sẵn sử dụng hoàn toàn giống với plugin do người dùng viết, thậm chí bạn còn có thể dùng một số thư viện bên thứ ba mà Yank Note sử dụng ngay trong plugin.

## Viết một plugin

1. Nhấp chuột phải vào biểu tượng ở khay hệ thống và chọn "Open Main Dir" (Mở thư mục chính)
2. Tạo một file mới `plugin-hello.js` trong `<thư mục chính>/plugins`
3. Mở file `plugin-hello.js` và viết nội dung sau.
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
4. Nhấp chuột phải vào biểu tượng ở khay hệ thống và chọn "Develop > Reload" (Phát triển > Tải lại)

Giờ bạn sẽ thấy menu "HELLO" xuất hiện trên thanh trạng thái.

## Khái niệm cốt lõi

Yank Note có một số khái niệm làm nền tảng cho toàn bộ hệ thống plugin:

1. Hook
1. Action

### Hook

Khi Yank Note thực hiện một số thao tác, nó sẽ kích hoạt các lời gọi hook.

Dùng [`ctx.registerHook`](https://yn-api-doc.vercel.app/modules/renderer_core_hook.html#registerHook) để đăng ký một hàm xử lý hook.

Dùng [`ctx.triggerHook`](https://yn-api-doc.vercel.app/modules/renderer_core_hook.html#triggerHook) để kích hoạt một hook.

Khi gọi `triggerHook` có kèm tùy chọn `{ breakable: true }`, điều đó có nghĩa là lời gọi hook này có thể bị ngắt.

Các lời gọi hook nội bộ sau đây có thể bị ngắt:

- `ACTION_AFTER_RUN`
- `ACTION_BEFORE_RUN`
- `TREE_NODE_SELECT`
- `VIEW_ELEMENT_CLICK`
- `VIEW_ELEMENT_DBCLICK`
- `VIEW_KEY_DOWN`
- `EDITOR_PASTE_IMAGE`

Hàm xử lý của hook có thể ngắt cần trả về giá trị kiểu `Promise<boolean> | boolean`. Khi hàm xử lý trả về `true`, các hook phía sau sẽ không chạy nữa.

Về các loại hook nội bộ, xem [Tài liệu API](https://yn-api-doc.vercel.app/modules/renderer_types.html#BuildInHookTypes)

### Action

Yank Note có một trung tâm Action [`ctx.action`](https://yn-api-doc.vercel.app/modules/renderer_core_action.html), cung cấp chức năng quản lý và thực thi action.

Về các action nội bộ, xem [Tài liệu API](https://yn-api-doc.vercel.app/modules/renderer_types.html#BuildInActions)

## Khả năng của plugin

Như bạn thấy ở trên, các chức năng của plugin đều được hiện thực thông qua các module của `ctx`.

Ngoài các module cốt lõi kể trên, `ctx` còn có rất nhiều module khác, bao quát hầu hết mọi khía cạnh của trình soạn thảo.

Chạy đoạn code sau, bạn sẽ thấy `ctx` có những module nào.

```js
// --run-- --no-worker--
console.log(Object.keys(ctx).join('\n'))
```

Xem [Tài liệu API](https://yn-api-doc.vercel.app/modules/renderer_context.html) để biết thêm hướng dẫn.

## Phân phối plugin

Nếu bạn muốn chia sẻ plugin/giao diện (theme) của mình cho người khác, hãy xem https://github.com/purocean/yank-note-extension#readme

## Thêm nữa

Nói chung, Yank Note khuyến khích người dùng tự tạo công cụ làm việc và học tập của riêng mình, chỉ cần vài dòng code là có thể hỗ trợ công việc và việc học.

Ngoài ra, nếu bạn chỉ cần tạo vài công cụ tiện dụng, bạn không cần viết plugin mà có thể dùng chức năng [Chạy code](FEATURES_VI.md#Chạy-code) hoặc viết [Applet](FEATURES_VI.md#Applet) để thực hiện. Khả năng chạy code js ở đây cũng hoàn toàn mở, và biến toàn cục `ctx` cũng có đầy đủ các chức năng nói trên.

Ví dụ, chạy code js:

```js
// --run-- --no-worker--
ctx.ui.useToast().show("info", "HELLOWORLD!")
console.log("hello world!")
```

Applet

```html
<!-- --applet-- -->
<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">HELLO</button>
```
