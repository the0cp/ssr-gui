import { ipcRenderer } from 'electron'
import store from './store'
import { showNotification, showHtmlNotification } from './notification'
import scanQrcode from './qrcode/scan-screenshot'
import * as events from '../shared/events'
import { loadConfigsFromString } from '../shared/ssr'

ipcRenderer
  .on(events.EVENT_APP_NOTIFY_MAIN, (e, { title, body }) => {
    showHtmlNotification(body, title)
  })
  .on(events.EVENT_APP_MAC_DARKMODE, (e, isDark) => {
    store.commit('updateTheme', isDark ? 'dark' : 'light')
  })
  .on(events.EVENT_APP_SCAN_DESKTOP, () => {
    scanQrcode((e, result) => {
      if (e) {
        showNotification('No avallible code found', 'Failed to scan')
      } else {
        const configs = loadConfigsFromString(result)
        if (configs.length) {
          store.dispatch('addConfigs', configs)
          showNotification(`Added${configs.length}records`)
        }
      }
    })
  })
  .on(events.EVENT_APP_SHOW_PAGE, (e, targetView) => {
    console.log('received view update: ', targetView.page, targetView.tab)
    store.commit('updateView', { ...targetView, fromMain: true })
  })
  .on(events.EVENT_APP_ERROR_MAIN, (e, err) => {
    alert(err)
  })
  .on(events.EVENT_SUBSCRIBE_UPDATE_MAIN, () => {
    store
      .dispatch('updateSubscribes')
      .then(updatedCount => {
        if (updatedCount > 0) {
          showNotification(`Sub updated${updatedCount}node(s)`)
        } else {
          showNotification(`Sub updated 0 node`)
        }
      })
      .catch(() => {
        showNotification('Failed to update')
      })
  })
  .on(events.EVENT_RX_SYNC_MAIN, (e, appConfig) => {
    console.log('received sync data: %o', appConfig)
    store.commit('updateConfig', [appConfig])
  })

/**
 * @param {Object} appConfig
 */
export function syncConfig (appConfig) {
  console.log('start sync data: %o', appConfig)
  ipcRenderer.send(events.EVENT_RX_SYNC_RENDERER, appConfig)
}

export function getInitConfig () {
  console.log('get init config data')
  const res = ipcRenderer.sendSync(events.EVENT_APP_WEB_INIT)
  store.dispatch('initConfig', res)
}

export function toggleMenu () {
  ipcRenderer.send(events.EVENT_APP_TOGGLE_MENU)
}

export function hideWindow () {
  ipcRenderer.send(events.EVENT_APP_HIDE_WINDOW)
}

export function openDialog (options) {
  return ipcRenderer.sendSync(events.EVENT_APP_OPEN_DIALOG, options)
}
