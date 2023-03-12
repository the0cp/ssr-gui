import path from 'path'
import { app, dialog } from 'electron'
import { ensureDir, pathExists, outputJson } from 'fs-extra'
import logger from './logger'
import sudo from 'sudo-prompt'
import defaultConfig from '../shared/config'
import { isWin, isMac, isLinux, isOldMacVersion, isPythonInstalled } from '../shared/env'
import { init as initIcon } from '../shared/icon'

// app ready
export const readyPromise = new Promise(resolve => {
  if (app.isReady()) {
    resolve()
  } else {
    app.once('ready', resolve)
  }
})

// check python
if (!isPythonInstalled) {
  dialog.showErrorBox('Error', 'Please install python first.')
  // require('./python').init()
}

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path')
    .join(__dirname, '/static')
    .replace(/\\/g, '\\\\')
}

process.on('unhandledRejection', (reason, p) => {
  logger.error(`Unhandled Rejection at: Promise ${p}, reason: ${reason}`)
})

export const appConfigDir = app.getPath('userData')
export const appConfigPath = path.join(appConfigDir, 'gui-config.json')
export const defaultSSRDownloadDir = path.join(appConfigDir, 'shadowsocksr')
export const pacPath = path.join(appConfigDir, 'pac.txt')
export const subscribeUpdateFile = path.join(appConfigDir, '.subscribe.update.last')
export const exePath = app.getPath('exe')
let _winToolPath
if (isWin) {
  if (process.env.NODE_ENV === 'development') {
    _winToolPath = path.resolve(__dirname, '../tools/sysproxy.exe')
  } else {
    _winToolPath = path.join(exePath, '../sysproxy.exe')
  }
}
export const winToolPath = _winToolPath
export const macToolPath = path.resolve(appConfigDir, 'proxy_conf_helper')

// try fix linux dismiss bug
// if (isLinux) {
//   process.env.XDG_CURRENT_DESKTOP = 'Unity'
// }

async function sudoMacCommand (command) {
  return new Promise((resolve, reject) => {
    sudo.exec(command, { name: 'ShadowsocksR Client' }, (error, stdout, stderr) => {
      if (error || stderr) {
        reject(error || stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

async function init () {
  initIcon()
  await ensureDir(appConfigDir)
  const configFileExists = await pathExists(appConfigPath)
  if (!configFileExists) {
    await outputJson(appConfigPath, defaultConfig, { spaces: '\t' })
  }
  await ensureDir(path.join(appConfigDir, 'logs'))

  if (isMac && !isOldMacVersion && !(await pathExists(macToolPath))) {
    const helperPath =
      process.env.NODE_ENV === 'development'
        ? path.join(__dirname, '../lib/proxy_conf_helper')
        : path.join(exePath, '../../../Contents/proxy_conf_helper')
    await sudoMacCommand(
      `cp ${helperPath} "${macToolPath}" && chown root:admin "${macToolPath}" && chmod a+rx "${macToolPath}" && chmod +s "${macToolPath}"`
    )
  }
  return readyPromise
}

export default init()
