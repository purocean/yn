import * as path from 'path'
import * as os from 'os'
import * as yargs from 'yargs'
import { isWsl, toWslPath, getWinHomePath } from './wsl'
import { convertAppPath } from '../helper'

const homedir = isWsl ? toWslPath(getWinHomePath()) : os.homedir()

export const HOME_DIR = homedir
export const USER_DIR = path.resolve((yargs.argv['data-dir'] as any) || path.join(homedir, 'yank-note'))
export const TRASH_DIR = path.join(USER_DIR, 'trash')
export const MAIN_REPO_DIR = path.join(USER_DIR, 'main')
export const CONFIG_FILE = path.join(USER_DIR, 'config.json')
export const STATIC_DIR = path.join(__dirname, '../../frontend/dist')
export const HELP_DIR = path.join(__dirname, '../../help')
export const ASSETS_DIR = path.join(__dirname, '../assets')
export const USER_PLUGIN_DIR = path.join(USER_DIR, './plugins')

export const BIN_DIR = convertAppPath(path.join(__dirname, '../../bin'))
export const RESOURCES_DIR = convertAppPath(path.join(__dirname, '../resources'))
