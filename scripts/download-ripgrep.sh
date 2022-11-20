#!/bin/sh

set -e

# Runing only on Darwin
if [ "$(uname)" != "Darwin" ]; then
  exit 0
fi

NODE_MODULES_PATH="$(dirname "$0")/../node_modules"
BIN_PATH="$(dirname "$0")/../bin"

# Download x64 ripgrep
export npm_config_arch=x64
node "$NODE_MODULES_PATH/@vscode/ripgrep/lib/postinstall.js" --force
mv "$NODE_MODULES_PATH/@vscode/ripgrep/bin/rg" "$BIN_PATH/rg-darwin-x64"

# Download arm64 ripgrep
export npm_config_arch=arm64
node "$NODE_MODULES_PATH/@vscode/ripgrep/lib/postinstall.js" --force
mv "$NODE_MODULES_PATH/@vscode/ripgrep/bin/rg" "$BIN_PATH/rg-darwin-arm64"
