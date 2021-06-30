import * as fs from 'fs'
import * as path from 'path'
import { USER_DIR, TRASH_DIR, USER_PLUGIN_DIR } from './constant'
import './updater'

export default function () {
  if (!fs.existsSync(USER_DIR)) {
    fs.mkdirSync(USER_DIR)
  }
  if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR)
  }
  if (!fs.existsSync(USER_PLUGIN_DIR)) {
    fs.mkdirSync(USER_PLUGIN_DIR)
    fs.writeFileSync(path.join(USER_PLUGIN_DIR, 'plugin-example.js'), `
window.registerPlugin({
  name: 'example-plugin',
  register: ctx => {
    console.log('example-plugin', 'register', ctx);

    // setTimeout(() => {
    //   ctx.ui.useToast().show('info', 'HELLO WORLD!');
    // }, 2000);
  }
});
    `.trim())
  }
}
