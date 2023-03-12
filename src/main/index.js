import { app, powerMonitor, systemPreferences } from 'electron'
import AutoLaunch from 'auto-launch'
import bootstrap from './bootstrap'
import { isQuiting, appConfig$, currentConfig, addConfigs } from './data'
import { destroyTray } from './tray'
import './menu'
import './ipc'
import { stopPacServer } from './pac'
import { stopHttpProxyServer } from './http-proxy'
import { stop as stopCommand, runWithConfig } from './client'
import { setProxyToNone, getLinuxTheme } from './proxy'
import { createWindow, showWindow, getWindow, destroyWindow, sendData } from './window'
import { startTask, stopTask } from './subscribe'
import logger from './logger'
import { clearShortcuts } from './shortcut'
import { loadConfigsFromString } from '../shared/ssr'
import { isMac, isWin, isLinux } from '../shared/env'
import { EVENT_APP_MAC_DARKMODE } from '../shared/events'

const singleLock = app.requestSingleInstanceLock()

if (!singleLock) {
  app.exit()
} else {
  const _window = getWindow()
  if (_window) {
    if (_window.isMinimized()) {
      _window.restore()
    }
    _window.focus()
  }
  // load configs
  app.on('second-instance', (e, argv, workingDirectory) => {
    if (argv[1]) {
      const configs = loadConfigsFromString(argv[1])
      if (configs.length) {
        addConfigs(configs)
      }
    }
  })
}

bootstrap.then(() => {
  createWindow()
  if (isWin || isMac) {
    app.setAsDefaultProtocolClient('ssr')
    app.setAsDefaultProtocolClient('ss')
  }

  if (isMac && systemPreferences.isDarkMode()) {
    sendData(EVENT_APP_MAC_DARKMODE, systemPreferences.isDarkMode())
  }
  if (isMac) {
    systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', async () => {
      const win = getWindow()
      if (win) {
        sendData(EVENT_APP_MAC_DARKMODE, systemPreferences.isDarkMode())
      }
    })
  }

  if (isLinux) {
    const desktopTheme = getLinuxTheme()
    if (/dark/i.test(desktopTheme)) {
      const win = getWindow()
      if (win) {
        sendData(EVENT_APP_MAC_DARKMODE, true)
      }
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    checkUpdate()
  }

  // startup
  const AutoLauncher = new AutoLaunch({
    name: 'ShadowsocksR Client',
    isHidden: true,
    mac: {
      useLaunchAgent: true,
    },
  })

  appConfig$.subscribe(data => {
    const [appConfig, changed] = data
    if (!changed.length) {
      if (!appConfig.configs.length || !appConfig.ssrPath) {
        showWindow()
      }
    }
    if (!changed.length || changed.indexOf('autoLaunch') > -1) {
      AutoLauncher.isEnabled()
        .then(enabled => {
          if (appConfig.autoLaunch !== enabled) {
            return AutoLauncher[appConfig.autoLaunch ? 'enable' : 'disable']().catch(() => {
              logger.error(`${appConfig.autoLaunch ? 'Apply' : 'Cancel'}Failed to autoLaunch`)
            })
          }
        })
        .catch(() => {
          logger.error('Failed to check autoLaunch state')
        })
    }
  })

  // power monitor
  powerMonitor
    .on('suspend', () => {
      // suspend
      logger.info('power suspend')
      stopTask()
      // setProxyToNone()
      stopCommand(true)
    })
    .on('resume', () => {
      logger.info('power resumed')
      runWithConfig(currentConfig)
      // startProxy()
      startTask(currentConfig)
    })
})

app.on('window-all-closed', () => {
  logger.debug('window-all-closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuiting(true)
})

app.on('will-quit', e => {
  logger.debug('will-quit')
  e.preventDefault()
  stopTask()
  setProxyToNone()
  destroyTray()
  destroyWindow()
  stopHttpProxyServer()
  stopPacServer()
  clearShortcuts()
  stopCommand(true).then(() => {
    app.exit(0)
  })
})

app.on('activate', () => {
  if (getWindow() === null) {
    createWindow()
  }
})
