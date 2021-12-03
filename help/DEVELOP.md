# Development environment setup guide

English | [中文说明](./DEVELOP_ZH-CN.md)

## Development environment setup

### install node
### install n
n is the version control software of node. You can switch the version of node at will, because yn needs a version above 12.0 to be used
n to switch

View the current node version：
`node –v`

install n
`npm install -g n`

Upgrade to the specified version/latest version (this step may take some time) Before upgrading, you can execute n ls (check the upgradeable version)`n v16.0.0`

Or you can tell the manager to install the latest stable version
`n stable | n latest`

### 安装依赖
`yarn install`

Note that sometimes all dependencies cannot be successfully installed, so you need to install them manually one by one
At this time only need `npm install package@version` as `npm install mine@2.5.2`

The node-pty module cannot be simply installed successfully, it can be operated as described below

### install electron-rebuild
`npm install --save-dev electron-rebuild`
### rebuild pty
`npm run rebuild-pty`

### start dev
`npm run dev`


