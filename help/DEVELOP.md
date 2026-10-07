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



## HTTP API request boundary

API requests are checked before body parsing or route effects. The server
validates Host independently of Origin and forwarding headers, rejects explicit
cross-origin, opaque/null, malformed or contradictory browser provenance, and
accepts its same-origin browser and internal Electron protocol requests.
Requests without Origin, Referer or Sec-Fetch-Site retain the existing native
API/MCP authentication behavior. This is compatibility, not proof of a trusted
caller: native programs and older clients can omit or forge browser headers.
No MCP configuration or token issuance changes are required.

Body-bearing API requests require `application/json` (parameters such as charset
are allowed), with these existing-format exceptions:
- POST `/api/attachment`: multipart form upload is also accepted.
- POST `/api/tmp-file` and `/api/user-file`: raw `text/plain` is also accepted.
- `/api/proxy-fetch/…`: the original stream is forwarded without MIME filtering.

All exceptions still receive the source and permission checks. Bodyless
GET/DELETE and existing query-only extension actions need no JSON body. Known
body-driven mutation routes reject unsupported methods before reaching handlers.
Non-API resources are not subject to the JSON requirement.

The executable embed document additionally requires trusted provenance even for
navigation, including its static/encoded path aliases. Root-page navigation and
same-origin/internal preview frames and windows remain supported. Socket.IO
polling, upgrades and pre-PTY handling independently require trusted provenance
and a loopback peer; native API compatibility does not exempt terminal requests.
The `yank-note:` renderer uses WebSocket directly; browser transport defaults stay
unchanged.

Settings JSON and JavaScript responses remove only `server.jwt-secret` from a
copy. Cached and persisted settings and the signing key are not rotated.
These checks do not solve same-origin XSS, native same-user access or the existing
loopback-admin risk of an externally exposed reverse proxy. Reverse-proxy access
needs separate authentication and compatible Host/source configuration.

Development proxy adaptation is intentionally outside this change. The existing
Vite frontend port/forwarded Host and source may be rejected by the backend;
this change does not add development-origin exceptions or modify Vite.
