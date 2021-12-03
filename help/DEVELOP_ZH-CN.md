# 开发环境搭建指南

[English](./DEVELOP.md) | 中文

## 开发环境搭建

### 安装node
### 安装n
n是node的版本控制软件可以随意切换node版本，因为yn需要12.0以上的版本可以用
n进行切换

查看当前node版本：
`node –v`

安装n模块
`npm install -g n`

升级到指定版本/最新版本（该步骤可能需要花费一些时间）升级之前，可以执行n ls （查看可升级的版本）
`n v16.0.0`

或者你也可以告诉管理器，安装最新的稳定版本
`n stable | n latest`

### 安装依赖
`yarn install`

注意，有时并不能成功的安装所以的依赖，所以需要一个一个手动安装
这时只需要 `npm install package@version` 如 `npm install mine@2.5.2`
有时候electron和node-pty模块不能简单的安装成功，可以像下面介绍的那样进行操作
### 安装electron
推荐采用淘宝源进行下载

设置源
`npm config set electron_mirror http://npm.taobao.org/mirrors/electron/`

设置下载的electron版本
`npm config set electron_custom_dir "16.0.0"`

这里的16.0.0 是指当前node对应的版本具体的版本可以在
http://npm.taobao.org/mirrors/electron

指定版本安装
npm install electron@16.0.0

### 安装electron-rebuild
`npm install --save-dev electron-rebuild`
### 重新编译pty
`npm run rebuild-pty`

### 启动调试
`npm run dev`





