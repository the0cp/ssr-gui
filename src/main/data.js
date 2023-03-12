import { Observable } from 'rxjs'
import { share } from 'rxjs/operators'
import { readJson, writeJson } from 'fs-extra'
import bootstrap, { appConfigPath } from './bootstrap'
import { sendData } from './window'
import { EVENT_RX_SYNC_MAIN } from '../shared/events'
import { isArray, getUpdatedKeys, configMerge, clone } from '../shared/utils'
import defaultConfig, { mergeConfig } from '../shared/config'

let promise
let _isQuiting = false
let isFromRenderer = false
export let currentConfig

async function read () {
  try {
    return await readJson(appConfigPath)
  } catch (e) {
    return Promise.resolve(defaultConfig)
  }
}

async function init () {
  await bootstrap
  const stored = await read()
  mergeConfig(stored)
  return stored
}

let _observe
const source = new Observable(observe => {
  _observe = observe
  promise = init().then(data => {
    currentConfig = data
    isFromRenderer = false
    observe.next([data, [], null, isProxyStarted(data), false])
  })
})

export function isProxyStarted (appConfig) {
  return !!(appConfig.enable && appConfig.configs && appConfig.configs[appConfig.index])
}

/**
 * @param {Object} targetConfig
 */
export function updateAppConfig (targetConfig, fromRenderer = false, forceAppendArray = false) {
  const changedKeys = getUpdatedKeys(currentConfig, targetConfig)
  if (changedKeys.length) {
    const oldConfig = clone(currentConfig, true)
    configMerge(currentConfig, targetConfig, forceAppendArray)
    isFromRenderer = fromRenderer
    _observe.next([currentConfig, changedKeys, oldConfig, isProxyStarted(currentConfig), isProxyStarted(oldConfig)])
  }
}

/**
 * @param {Array} configs
 */
export function addConfigs (configs) {
  updateAppConfig(
    {
      configs: currentConfig.configs.concat(isArray(configs) ? configs : [configs]),
    },
    false,
    true
  )
}

export const appConfig$ = source.pipe(share())

export function isQuiting (target) {
  if (target !== undefined) {
    _isQuiting = target
  } else {
    return _isQuiting
  }
}

appConfig$.subscribe(data => {
  const [appConfig, changed] = data
  if (changed.length) {
    writeJson(appConfigPath, appConfig, { spaces: '\t' })
    if (!isFromRenderer) {
      sendData(EVENT_RX_SYNC_MAIN, appConfig)
    }
  }
})

export default promise
