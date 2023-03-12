import { app, shell, clipboard } from 'electron'
import { readJson, writeJson } from 'fs-extra'
import { join } from 'path'
import bootstrapPromise, { appConfigPath } from './bootstrap'
import { logPath } from './logger'
import { showWindow, sendData } from './window'
export { openDevtool } from './window'
export { updateSubscribes } from './subscribe'
import { updateAppConfig, currentConfig } from './data'
import { downloadPac } from './pac'
import { startProxy } from './proxy'
import { showNotification } from './notification'
import * as events from '../shared/events'
import { loadConfigsFromString } from '../shared/ssr'
import { chooseFile, chooseSavePath } from '../shared/dialog'

export function toggleEnable () {
  updateAppConfig({ enable: !currentConfig.enable })
}

export function toggleProxy (mode) {
  startProxy(mode)
  updateAppConfig({ sysProxyMode: mode })
}

export function switchConfig (index) {
  updateAppConfig({ index })
}

export function updatePac () {
  downloadPac(true)
    .then(() => {
      showNotification('PAC updated')
    })
    .catch(() => {
      showNotification('Failed to update PAC')
    })
}

export function scanQRCode () {
  sendData(events.EVENT_APP_SCAN_DESKTOP)
}

export function openOptionsWindow () {
  sendData(events.EVENT_APP_SHOW_PAGE, 'Options')
}

export function importConfigFromFile () {
  const _path = chooseFile('Choose gui-config.json', [{ name: 'Json', extensions: ['json'] }])
  if (_path) {
    readJson(_path)
      .then(fileConfig => {
        updateAppConfig(fileConfig, false, true)
      })
      .catch(() => {})
  }
}

export function exportConfigToFile () {
  const _path = chooseSavePath('Choose save path')
  if (_path) {
    writeJson(join(_path, 'gui-config.json'), currentConfig, { spaces: '\t' })
  }
}

export function importConfigFromClipboard () {
  const parsed = loadConfigsFromString(clipboard.readText().trim())
  if (parsed.length) {
    updateAppConfig({ configs: [...currentConfig.configs, ...parsed] })
  }
  showNotification(parsed.length ? `${parsed.length} imported` : 'Failed to import')
}

export async function openConfigFile () {
  await bootstrapPromise
  shell.openItem(appConfigPath)
}

export async function openLog () {
  await bootstrapPromise
  shell.openItem(logPath)
}

export function showOptions () {
  showWindow()
  sendData(events.EVENT_APP_SHOW_PAGE, { page: 'Options' })
}

export function showSubscribes () {
  showWindow()
  sendData(events.EVENT_APP_SHOW_PAGE, { page: 'Options', tab: 'subscribes' })
}

export function showManagePanel () {
  showWindow()
  sendData(events.EVENT_APP_SHOW_PAGE, { page: 'ManagePanel' })
}

export function copyHttpProxyCode () {
  clipboard.writeText(`export http_proxy="http://127.0.0.1:${currentConfig.httpProxyPort}"
export https_proxy="http://127.0.0.1:${currentConfig.httpProxyPort}"
`)
}

export function showMainWindow () {
  showWindow()
}

export function openURL (url) {
  return shell.openExternal(url)
}

export function exitApp () {
  app.quit()
}
