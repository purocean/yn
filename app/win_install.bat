@echo off
setlocal
set npm_config_disturl="https://atom.io/download/electron"
set npm_config_target=6.0.0
set npm_config_runtime="electron"
set npm_config_cache=~\.npm-electron
REM npm i --registry=https://registry.npm.taobao.org
yarn
endlocal
