import Vue from 'vue'
import Vuex from 'vuex'
import defaultConfig from '../shared/config'
import {
  merge,
  clone,
  request,
  isSubscribeContentValid,
  getUpdatedKeys,
  isConfigEqual,
  somePromise,
} from '../shared/utils'
import emojies from '../shared/emoji'
import Config from '../shared/ssr'
import { syncConfig } from './ipc'
import {
  STORE_KEY_FEATURE,
  STORE_KEY_SSR_METHODS,
  STORE_KEY_SSR_PROTOCOLS,
  STORE_KEY_SSR_OBFSES,
  STORE_KEY_WIN_THEME,
} from './constants'
import Store from 'electron-store'

Vue.use(Vuex)

const editingConfig = new Config()
const configKeys = Object.keys(editingConfig)
const views = ['Feature', 'Setup', 'ManagePanel', 'Options']
let groupTitleBak = ''
const ls = new Store()
// window.localStorage
// const featureReaded = !!ls.getItem(STORE_KEY_FEATURE)
const featureReaded = !!ls.get(STORE_KEY_FEATURE)

// const storedMethods = ls.getItem(STORE_KEY_SSR_METHODS)
// const storedProtocols = ls.getItem(STORE_KEY_SSR_PROTOCOLS)
// const storedObfses = ls.getItem(STORE_KEY_SSR_OBFSES)
const storedMethods = ls.get(STORE_KEY_SSR_METHODS)
const storedProtocols = ls.get(STORE_KEY_SSR_PROTOCOLS)
const storedObfses = ls.get(STORE_KEY_SSR_OBFSES)
const storedTheme = ls.get(STORE_KEY_WIN_THEME)

let methods
let protocols
let obfses
// ssr methods
if (storedMethods) {
  methods = JSON.parse(storedMethods)
} else {
  methods = [
    'none',
    'aes-128-cfb',
    'aes-192-cfb',
    'aes-256-cfb',
    'aes-128-cfb8',
    'aes-192-cfb8',
    'aes-256-cfb8',
    'aes-128-ctr',
    'aes-192-ctr',
    'aes-256-ctr',
    'camellia-128-cfb',
    'camellia-192-cfb',
    'camellia-256-cfb',
    'bf-cfb',
    'rc4',
    'rc4-md5',
    'rc4-md5-6',
    'salsa20',
    'chacha20',
    'chacha20-ietf',
  ]
  ls.set(STORE_KEY_SSR_METHODS, JSON.stringify(methods))
}
// ssr protocols
if (storedProtocols) {
  protocols = JSON.parse(storedProtocols)
} else {
  protocols = [
    'origin',
    'verify_deflate',
    'auth_sha1_v4',
    'auth_aes128_md5',
    'auth_aes128_sha1',
    'auth_chain_a',
    'auth_chain_b',
  ]
  ls.set(STORE_KEY_SSR_PROTOCOLS, JSON.stringify(protocols))
}
// ssr obfses
if (storedObfses) {
  obfses = JSON.parse(storedObfses)
} else {
  obfses = [
    'plain',
    'http_simple',
    'http_post',
    'ramdom_head',
    'tls1.2_ticket_auth',
    'tls1.2_ticket_fastauth',
  ]
  ls.set(STORE_KEY_SSR_OBFSES, JSON.stringify(obfses))
}

export { ls }

export default new Vuex.Store({
  state: {
    appConfig: defaultConfig,
    meta: {
      version: '',
      defaultSSRDownloadDir: '',
    },
    view: {
      page: featureReaded ? views[1] : views[0],
      tab: 'common',
      active: false,
    },
    theme: storedTheme,
    editingConfig,
    editingConfigBak: new Config(),
    editingGroup: { show: false, title: '', updated: false },
    methods,
    protocols,
    obfses,
  },
  mutations: {
    updateConfig (state, [targetConfig, sync = false]) {
      const changed = getUpdatedKeys(state.appConfig, targetConfig)
      if (changed.length) {
        const extractConfig = {}
        changed.forEach(key => {
          extractConfig[key] = targetConfig[key]
        })
        merge(state.appConfig, extractConfig)
        console.log('config updated: ', extractConfig)
        if (sync) {
          syncConfig(extractConfig)
        }
      }
    },

    updateMeta (state, targetMeta) {
      merge(state.meta, targetMeta)
      console.log('meta updated: ', targetMeta)
    },

    updateTheme (state, theme) {
      ls.set(STORE_KEY_WIN_THEME, theme)
      state.theme = theme
    },

    updateView (state, targetView) {
      merge(state.view, targetView)
    },

    prevView (state) {
      state.view.page = views[views.indexOf(state.view.page) - 1]
    },

    nextView (state) {
      state.view.page = views[views.indexOf(state.view.page) + 1]
    },

    setCurrentConfig (state, ssrConfig) {
      merge(state.editingConfig, ssrConfig)
      merge(state.editingConfigBak, ssrConfig)
    },

    updateEditingBak (state) {
      merge(state.editingConfigBak, state.editingConfig)
    },

    resetState (state) {
      merge(state.editingConfig, state.editingConfigBak)
      merge(state.view, {
        page: views.indexOf(state.view.page) >= 2 ? views[2] : state.view.page,
        tab: 'common',
        active: false,
      })
      state.editingGroup.title = groupTitleBak
    },

    updateEditingGroup (state, newGroup) {
      merge(state.editingGroup, newGroup)
      groupTitleBak = newGroup.title
    },

    updateEditing (state, config) {
      merge(state.editingConfig, config)
    },
    updateMethods (state, methods) {
      state.methods = methods
      ls.set(STORE_KEY_SSR_METHODS, JSON.stringify(methods))
    },
    updateProtocols (state, protocols) {
      state.protocols = protocols
      ls.set(STORE_KEY_SSR_PROTOCOLS, JSON.stringify(protocols))
    },
    updateObfses (state, obfses) {
      state.obfses = obfses
      ls.set(STORE_KEY_SSR_OBFSES, JSON.stringify(obfses))
    },

    addCountryEmoji (state) {
      state.appConfig.configs.forEach(config => {
        if (config.emoji !== '')
          return
        for (let e of emojies) {
          if (config.remarks && e.pattern.test(config.remarks)) {
            config.emoji = e.emoji
            break
          }
        }
      })
      syncConfig(state.appConfig)
    },
  },
  actions: {
    initConfig ({ commit }, { config, meta }) {
      commit('updateConfig', [config])
      commit('updateMeta', meta)
      if (meta.version) {
        document.title = `${document.title} v${meta.version}`
      }
      const initialSelected = config.configs[config.index]
      if (initialSelected) {
        commit('setCurrentConfig', initialSelected)
      }
      if (config.ssrPath) {
        commit('updateView', { page: views[2] })
      }
    },
    updateConfig ({ getters, commit }, targetConfig) {
      let index
      if (targetConfig.configs && getters.selectedConfig) {
        index = targetConfig.configs.findIndex(config => config.id === getters.selectedConfig.id)
      }
      const correctConfig = index !== undefined && index > -1 ? { ...targetConfig, index } : targetConfig
      commit('updateConfig', [correctConfig, true])
    },
    updateConfigs ({ dispatch }, _configs) {
      const configs = _configs.map(config => {
        const _clone = clone(config)
        Object.keys(_clone).forEach(key => {
          if (configKeys.indexOf(key) < 0) {
            delete _clone[key]
          }
        })
        return _clone
      })
      dispatch('updateConfig', { configs })
    },
    addConfigs ({ state, dispatch }, configs) {
      if (configs.length) {
        dispatch('updateConfig', {
          configs: [...state.appConfig.configs, ...configs],
        })
      }
    },

    updateSubscribes ({ state, dispatch, commit }, updateSubscribes) {
      updateSubscribes = updateSubscribes || state.appConfig.serverSubscribes
      let updatedCount = 0
      return Promise.all(
        updateSubscribes.map(subscribe => {
          return somePromise([request(subscribe.URL, true), fetch(subscribe.URL).then(res => res.text())]).then(res => {
            const [groupCount, groupConfigs] = isSubscribeContentValid(res)
            if (groupCount > 0) {
              for (const groupName in groupConfigs) {
                const configs = groupConfigs[groupName]
                const count = configs.length
                const group = configs[0].group
                const groupedConfigs = []
                const notInGroupConfigs = []
                state.appConfig.configs.forEach(config => {
                  if (config.group === group) {
                    groupedConfigs.push(config)
                  } else {
                    notInGroupConfigs.push(config)
                  }
                })

                const oldNotChangedConfigs = groupedConfigs.filter(config => {
                  const i = configs.findIndex(_config => isConfigEqual(config, _config))
                  if (i > -1) {
                    configs.splice(i, 1)
                    return true
                  }
                  return false
                })
                const deleted = groupedConfigs.length - oldNotChangedConfigs.length
                if (configs.length || deleted !== count) {
                  dispatch('updateConfigs', oldNotChangedConfigs.concat(configs).concat(notInGroupConfigs))
                  updatedCount += configs.length
                } else {
                  console.log('No node updated')
                }
                commit('addCountryEmoji')
              }
            }
          })
        })
      ).then(() => {
        return updatedCount
      })
    },
  },
  getters: {
    selectedConfig: state => state.appConfig.configs[state.appConfig.index],
    isEditingConfigUpdated: state => !isConfigEqual(state.editingConfigBak, state.editingConfig),
  },
})
