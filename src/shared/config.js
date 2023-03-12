import { isLinux, isMac } from './env'

const defaultConfig = {
  configs: [],
  index: 0,
  enable: true,
  autoLaunch: false,
  shareOverLan: false,
  localPort: 1080,
  ssrPath: '',
  pacPort: 2333,
  sysProxyMode: 1,
  serverSubscribes: [],
  httpProxyEnable: true,
  globalShortcuts: {
    toggleWindow: {
      key: isLinux ? 'Ctrl+Shift+W' : '',
      enable: isLinux,
    },
    switchSystemProxy: {
      key: '',
      enable: false,
    },
  },

  windowShortcuts: {
    toggleMenu: {
      key: isLinux ? `${isMac ? 'Command' : 'Ctrl'}+Shift+B` : '',
      enable: isLinux,
    },
  },
  httpProxyPort: 12333,
  autoUpdateSubscribes: true,
  subscribeUpdateInterval: 24,
}

export default defaultConfig

export function mergeConfig (appConfig) {
  Object.keys(defaultConfig).forEach(key => {
    if (appConfig[key] === undefined || typeof appConfig[key] !== typeof defaultConfig[key]) {
      appConfig[key] = defaultConfig[key]
    } else if (typeof appConfig[key] === 'object') {
      for (const index in appConfig[key]) {
        if (appConfig[key][index] === undefined) {
          appConfig[key][index] = defaultConfig[key][index]
        }
      }
    }
  })
}
