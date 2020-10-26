@echo off
setlocal
set npm_config_disturl=https://atom.io/download/electron
set npm_config_target=9.3.1
set npm_config_runtime="electron"
set npm_config_cache=~\.npm-electron
yarn && yarn run download-pandoc
endlocal
