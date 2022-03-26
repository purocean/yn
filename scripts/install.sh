#!/bin/sh

export npm_config_disturl=https://atom.io/download/electron
export npm_config_target=15.4.1
export npm_config_runtime="electron"

yarn install
