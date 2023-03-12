import { app, ipcMain, dialog } from 'electron'
import { readJsonSync } from 'fs-extra'
// import downloadGitRepo from 'download-git-repo'
import * as events from '../shared/events'
import { appConfigPath, defaultSSRDownloadDir } from './bootstrap'
import { updateAppConfig } from './data'
import { hideWindow, sendData } from './window'
import { importConfigFromClipboard } from './tray-handler'
import defaultConfig, { mergeConfig } from '../shared/config'
import { showNotification } from './notification'
import { toggleMenu } from './menu'
import logger from './logger'

ipcMain
  .on(events.EVENT_APP_HIDE_WINDOW, () => {
    hideWindow()
  })
  .on(events.EVENT_APP_WEB_INIT, e => {
    let stored
    try {
      stored = readJsonSync(appConfigPath)
      mergeConfig(stored)
    } catch (e) {
      stored = defaultConfig
    }
    e.returnValue = {
      config: stored,
      meta: {
        version: app.getVersion(),
        defaultSSRDownloadDir,
      },
    }
  })
  .on(events.EVENT_RX_SYNC_RENDERER, (_, data) => {
    logger.debug(`received sync data: ${data}`)
    updateAppConfig(data, true)
  })
  .on(events.EVENT_SSR_DOWNLOAD_RENDERER, e => {
  //   logger.info('start download ssr')
  //   downloadGitRepo(`shadowsocksr-backup/shadowsocksr#dev`, defaultSSRDownloadDir, err => {
  //     logger[err ? 'error' : 'info'](`ssr download ${err ? 'error' : 'success'}`)
    e.sender.send(events.EVENT_SSR_DOWNLOAD_MAIN, 'failed to download ssr-n')
  //   })
  })
  .on(events.EVENT_CONFIG_COPY_CLIPBOARD, () => {
    logger.info('import config from clipboard')
    importConfigFromClipboard()
  })
  .on(events.EVENT_APP_NOTIFY_RENDERER, (_, body, title) => {
    showNotification(body, title)
  })
  .on(events.EVENT_APP_TOGGLE_MENU, () => {
    toggleMenu()
  })
  .on(events.EVENT_APP_OPEN_DIALOG, async (e, params) => {
    const ret = await dialog.showOpenDialog(params)
    e.returnValue = ret || ''
  })

/**
 * @param {String|Object} err
 */
export function showMainError (err) {
  sendData(events.EVENT_APP_ERROR_MAIN, err)
}
