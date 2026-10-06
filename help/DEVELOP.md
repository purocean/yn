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



## HTTP API and terminal request origins

HTTP API requests must come from the app's own origin. The server checks the
request Host against its configured listener and local addresses, then checks an
exact Origin (scheme, host and port). Same-origin resource GETs that omit Origin
can use an exact Referer or `Sec-Fetch-Site: same-origin`. Missing source metadata,
opaque `Origin: null`, cross-origin and contradictory source headers are rejected,
including on public/read-only API routes. This does not add tokens to app URLs.

The terminal separately checks the browser source and loopback peer on every
Socket.IO polling/upgrade request and before spawning a shell. Actual WebSocket
upgrades require Origin; same-origin polling GETs can use Referer/Fetch Metadata. The trusted Electron
`yank-note://localhost` scheme remains supported; only the in-process protocol
adapter can omit all source headers. Native API clients must send an allowed
Origin in addition to any authentication they previously needed.

When using a reverse proxy or another explicit browser-facing origin, add its
exact origin to `server.trusted-origins` in the config file, for example:
`"server.trusted-origins": ["https://notes.example"]`. Preserve the browser-facing
Host in the proxy; forwarding headers are not used as a trust source. Do not add
origins that host untrusted content. Authentication and role checks still apply.
The Vite development proxy validates the original browser source against its
actual listening address/port before adapting Host, Origin and Referer to the
backend. This covers HTTP, Socket.IO polling and WebSocket upgrades; it never
rewrites untrusted origins into trusted ones. The backend does not special-case
Vite ports or Electron packaging mode.

Settings responses never include `server.jwt-secret`, including the JavaScript
bootstrap response. Other admin settings and existing guest filtering are
unchanged. Saving settings without the key preserves the persisted signing key.
This change does not rotate keys or invalidate previously issued JWTs.

These checks protect the browser origin boundary and DNS rebinding. They do not
authenticate native local programs, which can forge browser headers, or protect
against code already running in the trusted app origin (such as same-origin XSS).
