import { app, globalShortcut } from 'electron'
import logger from './logger'
import { switchSystemProxy } from './proxy'
import { toggleWindow, showWindow, sendData } from './window'
import { appConfig$ } from './data'
import { showNotification } from './notification'
import { EVENT_APP_SHOW_PAGE } from '../shared/events'

const func = {
  toggleWindow,
  switchSystemProxy,
}

/**
 * @param {String} name
 * @param {String} key
 */
function registerShortcut (name, key) {
  if (!key) return false
  logger.info(`Register shortcut: ${name}, ${key}`)
  const ret = globalShortcut.register(key, func[name])
  if (!ret) {
    return false
  }
  return globalShortcut.isRegistered(key)
}

/**
 * @param {String} key
 */
function unregisterShortcut (key) {
  if (key) {
    globalShortcut.unregister(key)
    logger.info(`Unregister shortcut: ${key}`)
  }
}

export function clearShortcuts () {
  globalShortcut.unregisterAll()
}

/**
 * @param {Boolean} shortcutEnable
 * @param {String} oldKey
 * @param {String} newKey
 */
function switchRegister (funcName, shortcutEnable, oldKey, newKey) {
  unregisterShortcut(oldKey)
  if (shortcutEnable) {
    registerShortcut(funcName, newKey)
  }
}

app.on('ready', () => {
  appConfig$.subscribe(data => {
    const [appConfig, changed, oldConfig] = data
    if (!changed.length) {
      const failed = Object.keys(appConfig.globalShortcuts).filter(funcName => {
        if (appConfig.globalShortcuts[funcName].enable) {
          return !registerShortcut(funcName, appConfig.globalShortcuts[funcName].key)
        }
        return false
      })
      if (failed.length) {
        showNotification(`Failed to regist ${failed.length} key(s)`, 'Warning', () => {
          showWindow()
          sendData(EVENT_APP_SHOW_PAGE, { page: 'Options', tab: 'shortcuts' })
        })
      }
    } else {
      if (changed.indexOf('globalShortcuts') > -1) {
        Object.keys(appConfig.globalShortcuts).forEach(funcName => {
          const oldShortcut = oldConfig.globalShortcuts[funcName]
          const newShortcut = appConfig.globalShortcuts[funcName]
          if (oldShortcut.key !== newShortcut.key || oldShortcut.enable !== newShortcut.enable) {
            switchRegister(funcName, newShortcut.enable, oldShortcut.key, newShortcut.key)
          }
        })
      }
    }
  })
})
