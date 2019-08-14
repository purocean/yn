import * as path from 'path'
import * as os from 'os'
import { isWsl, toWslPath, getWinHomePath } from './wsl'

const homedir = isWsl ? toWslPath(getWinHomePath()) : os.homedir()

export const HOME_DIR = homedir
export const USER_DIR = path.join(homedir, 'yank-note')
export const TRASH_DIR = path.join(USER_DIR, 'trash')
export const MAIN_REPO_DIR = path.join(USER_DIR, 'main')
export const CONFIG_FILE = path.join(USER_DIR, 'config.json')
export const STATIC_DIR = path.join(__dirname, '../../frontend/dist')
export const BIN_DIR = path.join(__dirname, '../../bin')
export const HELP_DIR = path.join(__dirname, '../../help')
