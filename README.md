# 自用 markdown 编辑器
>vue + monaco-editor + markdown-it + nodejs + Koa

## 目标
1. 界面字大不费眼 :)
1. markdown 撰写
2. 图片文件保存在本地，导出 markdown 文件可简单处理离线工作
3. 支持一些流程图表绘制 startuml mermaidt
3. 支持加密解密，用来保存账号等隐私文件，文件可单独设置密码
4. 不需要更多花哨功能，简单够用就行
5. 尽量少依赖三方库，也不花心思维护，杂凑在一起的功能，恰好工作即可 ^_^
6. 在文档中运行 PHP Python Node.js 代码块

## 直接使用
+ `cd backend; yarn; node main.js`
+ 访问 `http://localhost:3000`
+ 新增文件：`双击目录`
+ 删除文件/目录：`shift + 右键文件/目录`
+ 重命名文件/目录：`ctrl + 右键文件/目录`
+ 文件加密：以 `.c.md` 结尾的文件视为加密文件
+ startuml 图形需要安装 Java
+ 运行代码块第一行需要包含以 `--run--` 字符串，示例见下面截图，需要安装 PHP Python Node.js

## 开发
+ 后端: `cd backend; node main.js`
+ 后端: `cd frontend; yarn run dev`

## 开发计划

+ [x] 回收站
+ [x] 文件重命名
+ [x] 文件树目录排列
+ [x] 打印 PDF 样式
+ [x] 保存快捷键
+ [x] 加密解密
+ [x] 优化输入列表体验
+ [x] 图片粘贴预览
+ [x] 未保存切换文件自动保存
+ [x] 密码输入优化
+ [x] 静态文件
+ [x] 公式显示
+ [x] 运行 python php nodejs 块
+ [ ] 运行代码支持图表生成
+ [ ] 增加 rss 抓取
+ [ ] 认证
+ [ ] 全文查找 Ctrl + p
+ [ ] 微信结合
+ [ ] git 备份
+ [ ] 标签
+ [ ] 移动端展示

![截图](./screenshot2.png)
![截图](./screenshot.png)
