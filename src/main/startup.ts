import * as fs from 'fs-extra'
import * as path from 'path'
import { USER_DIR, USER_PLUGIN_DIR, USER_THEME_DIR, RESOURCES_DIR, BUILD_IN_STYLES, PANDOC_REFERENCE_FILE, HISTORY_DIR, USER_EXTENSION_DIR } from './constant'
import './updater'

export default function () {
  try {
    fs.ensureDirSync(USER_DIR)
  } catch (error) {
    console.error('Failed to create user directory:', error)
    return
  }

  try {
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
  } catch (error) {
    console.error('Failed to create plugin directory:', error)
  }

  try {
    fs.ensureDirSync(USER_THEME_DIR)
  } catch (error) {
    console.error('Failed to create theme directory:', error)
  }

  try {
    fs.ensureDirSync(HISTORY_DIR)
  } catch (error) {
    console.error('Failed to create history directory:', error)
  }

  try {
    fs.ensureDirSync(USER_EXTENSION_DIR)
  } catch (error) {
    console.error('Failed to create extension directory:', error)
  }

  BUILD_IN_STYLES.forEach(style => {
    try {
      fs.writeFileSync(
        path.join(USER_THEME_DIR, style),
        fs.readFileSync(path.join(RESOURCES_DIR, style))
      )
    } catch (error) {
      console.error('Failed to write built-in style:', style, error)
    }
  })

  const docxTplPath = path.join(USER_DIR, PANDOC_REFERENCE_FILE)
  if (!fs.existsSync(docxTplPath)) {
    try {
      fs.createReadStream(path.join(RESOURCES_DIR, PANDOC_REFERENCE_FILE))
        .pipe(fs.createWriteStream(docxTplPath))
    } catch (error) {
      console.error('Failed to copy pandoc reference file:', error)
    }
  }
}
