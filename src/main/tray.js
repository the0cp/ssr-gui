import { Menu, Tray, nativeImage } from 'electron'
import { appConfig$ } from './data'
import * as handler from './tray-handler'
import { groupConfigs } from '../shared/utils'
import { isMac, isWin, isOldMacVersion } from '../shared/env'
import {
  disabledTray,
  enabledTray,
  enabledHighlightTray,
  pacTray,
  pacHighlightTray,
  globalTray,
  globalHighlightTray,
} from '../shared/icon'

let tray

/**
 * @param {*Array<Object>} configs
 * @param {*Number} selectedIndex
 */
function generateConfigSubmenus (configs, selectedIndex) {
  const groups = groupConfigs(configs, selectedIndex)
  const submenus = Object.keys(groups).map(key => {
    const groupedConfigs = groups[key]
    return {
      label: `${groupedConfigs.some(config => config.checked) ? '● ' : ''}${key}`,
      submenu: groupedConfigs.map(config => {
        return {
          id: config.id,
          label: `${config.emoji || ''}${config.remarks}(${config.server}:${config.server_port})`,
          type: 'checkbox',
          checked: config.checked,
          click (e) {
            const index = configs.findIndex(config => config.id === e.id)
            if (index === selectedIndex) {
              e.checked = true
            } else {
              handler.switchConfig(configs.findIndex(config => config.id === e.id))
            }
          },
        }
      }),
    }
  })
  if (!configs || !configs.length) {
    submenus.push({ label: 'none', enabled: false })
  }
  submenus.push({ type: 'separator' })
  submenus.push({ label: 'Edit server', click: handler.showManagePanel })
  submenus.push({ label: 'Manage Subs', click: handler.showSubscribes })
  submenus.push({ label: 'Update sub servers', click: handler.updateSubscribes })
  return submenus
}

/**
 * @param {Object} appConfig
 */
function generateMenus (appConfig) {
  const base = [
    { label: 'Main Window', click: handler.showManagePanel },
    {
      label: 'Run Service',
      type: 'checkbox',
      checked: appConfig.enable,
      click: handler.toggleEnable,
    },
    { label: 'PAC', submenu: [{ label: 'Update PAC', click: handler.updatePac }] },
    {
      label: 'Servers',
      submenu: generateConfigSubmenus(appConfig.configs, appConfig.index),
    },
    { label: 'Scan QR Code', click: handler.scanQRCode },
    {
      label: 'Configure',
      submenu: [
        { label: 'Options', click: handler.showOptions },
        {
          label: 'Import gui-config.json',
          click: handler.importConfigFromFile,
        },
        { label: 'Export gui-config.json', click: handler.exportConfigToFile },
        {
          label: 'Import from Clipboard',
          click: handler.importConfigFromClipboard,
        },
        { label: 'Open config', click: handler.openConfigFile },
      ],
    },
    { label: 'Copy http config', click: handler.copyHttpProxyCode },
    {
      label: 'Help',
      submenu: [
        { 
          label: 'View Logs',
          click: handler.openLog
        },
        { 
          label: 'Dev Tools',
          click: handler.openDevtool 
        },
      ],
    },
    { label: 'Exit', click: handler.exitApp },
  ]
  if (!isOldMacVersion) {
    base.splice(1, 0, {
      label: 'Proxy Mode',
      submenu: [
        {
          label: 'No System Proxy',
          type: 'checkbox',
          checked: appConfig.sysProxyMode === 0,
          click: e => changeProxy(e, 0, appConfig),
        },
        {
          label: 'PAC',
          type: 'checkbox',
          checked: appConfig.sysProxyMode === 1,
          click: e => changeProxy(e, 1, appConfig),
        },
        {
          label: 'Global',
          type: 'checkbox',
          checked: appConfig.sysProxyMode === 2,
          click: e => changeProxy(e, 2, appConfig),
        },
      ],
    })
  }
  return base
}

export function changeProxy (e, mode, appConfig) {
  if (mode === appConfig.sysProxyMode) {
    e.checked = true
  } else {
    handler.toggleProxy(mode)
  }
}

function getTooltip (appConfig) {
  if (!appConfig.enable) {
    return 'ShadowsocksR isn\'t running'
  }
  const arr = []
  if (appConfig.enable) {
    arr.push('ShadowsocksR is running\n')
  }
  arr.push('Proxy Mode')
  if (appConfig.sysProxyMode === 0) {
    arr.push('No System Proxy')
  } else if (appConfig.sysProxyMode === 1) {
    arr.push('PAC')
  } else if (appConfig.sysProxyMode === 2) {
    arr.push('Global')
  }
  const selectedConfig = appConfig.configs[appConfig.index]
  if (selectedConfig) {
    arr.push('\n')
    arr.push(
      `${selectedConfig.group ? selectedConfig.group + ' - ' : ''}${selectedConfig.remarks ||
        selectedConfig.server + ':' + selectedConfig.server_port}`
    )
  }
  return arr.join('')
}

/**
 * @param {Object} appConfig
 */
function updateTray (appConfig) {
  const menus = generateMenus(appConfig)
  const contextMenu = Menu.buildFromTemplate(menus)
  tray.setContextMenu(contextMenu)
  tray.setToolTip(getTooltip(appConfig))
}

function setTrayIcon (appConfig) {
  if (appConfig.enable) {
    if (appConfig.sysProxyMode === 1) {
      tray.setImage(pacTray)
      isMac && tray.setPressedImage(pacHighlightTray)
    } else if (appConfig.sysProxyMode === 2) {
      tray.setImage(globalTray)
      isMac && tray.setPressedImage(globalHighlightTray)
    } else {
      tray.setImage(enabledTray)
      isMac && tray.setPressedImage(enabledHighlightTray)
    }
  } else {
    tray.setImage(disabledTray)
    isMac && tray.setPressedImage(disabledTray)
  }
}

export default function renderTray (appConfig) {
  /* global __static */
  tray = new Tray(nativeImage.createEmpty())
  // tray = new Tray(path.join(__static, 'tray.png'))
  updateTray(appConfig)
  setTrayIcon(appConfig)
  tray.on(isMac || isWin ? 'double-click' : 'click', handler.showMainWindow)
}

export function destroyTray () {
  if (tray) {
    tray.destroy()
  }
}

appConfig$.subscribe(data => {
  const [appConfig, changed] = data
  if (!changed.length) {
    renderTray(appConfig)
  } else {
    if (['configs', 'index', 'enable', 'sysProxyMode'].some(key => changed.indexOf(key) > -1)) {
      updateTray(appConfig)
    }
    if (['enable', 'sysProxyMode'].some(key => changed.indexOf(key) > -1)) {
      setTrayIcon(appConfig)
    }
  }
})
