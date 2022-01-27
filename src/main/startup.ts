import * as fs from 'fs-extra'
import * as path from 'path'
import { USER_DIR, USER_PLUGIN_DIR, USER_THEME_DIR, RESOURCES_DIR, BUILD_IN_STYLES, PANDOC_REFERENCE_FILE, HISTORY_DIR } from './constant'
import './updater'

export default function () {
  fs.ensureDirSync(USER_DIR)
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
  fs.ensureDirSync(HISTORY_DIR)

  BUILD_IN_STYLES.forEach(style => {
    fs.writeFileSync(
      path.join(USER_THEME_DIR, style),
      fs.readFileSync(path.join(RESOURCES_DIR, style))
    )
  })

  const docxTplPath = path.join(USER_DIR, PANDOC_REFERENCE_FILE)
  if (!fs.existsSync(docxTplPath)) {
    fs.createReadStream(path.join(RESOURCES_DIR, PANDOC_REFERENCE_FILE))
      .pipe(fs.createWriteStream(docxTplPath))
  }
}
