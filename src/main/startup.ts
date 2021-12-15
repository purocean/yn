import * as fs from 'fs-extra'
import * as path from 'path'
import { USER_DIR, TRASH_DIR, USER_PLUGIN_DIR, USER_THEME_DIR } from './constant'
import './updater'

export default function () {
  fs.ensureDirSync(USER_DIR)
  fs.ensureDirSync(TRASH_DIR)
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

  fs.ensureDirSync(USER_THEME_DIR)
}
