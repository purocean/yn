import * as fs from 'fs'
import { USER_DIR, TRASH_DIR, MAIN_REPO_DIR } from './constant'

const init = () => {
  if (!fs.existsSync(USER_DIR)) {
    fs.mkdirSync(USER_DIR)
  }
  if (!fs.existsSync(MAIN_REPO_DIR)) {
    fs.mkdirSync(MAIN_REPO_DIR)
  }
  if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR)
  }
}

export default init
