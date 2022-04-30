import * as path from 'path'
import * as os from 'os'
import * as yargs from 'yargs'
import { isWsl, toWslPath, getWinHomePath } from './wsl'
import { convertAppPath } from './helper'

const homedir = isWsl ? toWslPath(getWinHomePath()) : os.homedir()

export const APP_NAME = 'yank-note'

export const HOME_DIR = homedir
export const USER_DIR = path.resolve((yargs.argv['data-dir'] as any) || path.join(homedir, APP_NAME))
export const CONFIG_FILE = path.join(USER_DIR, 'config.json')
export const STATIC_DIR = path.join(__dirname, '../renderer')
export const HELP_DIR = path.join(__dirname, '../../help')
export const ASSETS_DIR = path.join(__dirname, 'assets')
export const HISTORY_DIR = path.join(USER_DIR, './histories')
export const USER_PLUGIN_DIR = path.join(USER_DIR, './plugins')
export const USER_THEME_DIR = path.join(USER_DIR, './themes')
export const USER_EXTENSION_DIR = path.join(USER_DIR, './extensions')

export const BIN_DIR = convertAppPath(path.join(__dirname, '../../bin'))
export const RESOURCES_DIR = convertAppPath(path.join(__dirname, 'resources'))

export const BUILD_IN_STYLES = ['github.css']

export const PANDOC_REFERENCE_FILE = 'pandoc-reference.docx'

export const GITHUB_URL = 'https://github.com/purocean/yn'

export const FLAG_DISABLE_SERVER = false
export const FLAG_DISABLE_DEVTOOL = false
