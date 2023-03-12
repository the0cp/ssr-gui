import { app, Menu } from 'electron'
import { appConfig$, currentConfig } from './data'
import { changeProxy } from './tray'
import * as handler from './tray-handler'
import { isMac, isLinux } from '../shared/env'

let showLinuxMenu = false

export default function renderMenu (appConfig) {
  let template
  if (isMac) {
    template = [
      {
        label: app.getName(),
        submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteandmatchstyle' },
          { role: 'delete' },
          { role: 'selectall' },
        ],
      },
    ]
  } else if (isLinux) {
    if (showLinuxMenu) {
      template = [
        {
          label: 'App',
          submenu: [
            {
              label: 'Start',
              type: 'checkbox',
              checked: appConfig.enable,
              click: handler.toggleEnable,
            },
            { label: 'Scan QR Code', click: handler.scanQRCode },
            { label: 'Copy http config', click: handler.copyHttpProxyCode },
            { label: 'Exit', click: handler.exitApp },
          ],
        },
        {
          label: 'Proxy Mode',
          submenu: [
            {
              label: 'No system proxy',
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
        },
        {
          label: 'PAC',
          submenu: [{ label: 'Update PAC', click: handler.updatePac }],
        },
        {
          label: 'Configure',
          submenu: [
            {
              label: 'Import gui-config.json',
              click: handler.importConfigFromFile,
            },
            {
              label: 'Export gui-config.json',
              click: handler.exportConfigToFile,
            },
            { label: 'Open config', click: handler.openConfigFile },
          ],
        },
        {
          label: 'Help',
          submenu: [
            { label: 'View Logs',
              click: handler.openLog 
            },
            { label: 'Dev Tools',
              click: handler.openDevtool 
            },
          ],
        },
      ]
    }
  }
  template && Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

export function toggleMenu () {
  if (isLinux) {
    if (Menu.getApplicationMenu()) {
      showLinuxMenu = false
      Menu.setApplicationMenu(null)
    } else {
      showLinuxMenu = true
      renderMenu(currentConfig)
    }
  }
}

appConfig$.subscribe(data => {
  const [appConfig, changed] = data
  if (!changed.length) {
    renderMenu(appConfig)
  } else {
    if (['enable', 'sysProxyMode'].some(key => changed.indexOf(key) > -1)) {
      renderMenu(appConfig)
    }
  }
})
