import * as os from 'os'
import * as fs from 'fs'
import { execFileSync } from 'child_process'

export const getIsWsl = () => {
	if (process.platform !== 'linux') {
		return false;
	}

	if (os.release().toLowerCase().includes('microsoft')) {
		return true;
	}

	try {
		if (fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')) {
			return true;
		}
	} catch (_) {
		return false;
	}
}

export const isWsl = getIsWsl()

export const toWslPath = (path: string) => {
  return execFileSync('wslpath', ['-u', `${path.replace(/\\/g, '/')}`]).toString().trim()
}

export const toWinPath = (path: string) => {
  return execFileSync('wslpath', ['-w', path]).toString().trim()
}

export const getWinTempPath = () => {
  return execFileSync('cmd.exe', ['/c', 'echo %temp%']).toString().trim()
}

export const getWinHomePath = () => {
  return execFileSync('cmd.exe', ['/c', 'echo %HOMEDRIVE%%HOMEPATH%']).toString().trim()
}
