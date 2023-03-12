import { readFile, writeFile } from './promisify'
import { subscribeUpdateFile } from './bootstrap'
import { appConfig$ } from './data'
import { sendData } from './window'
import logger from './logger'
import { EVENT_SUBSCRIBE_UPDATE_MAIN } from '../shared/events'

let lastUpdateTime
let _interval
let _timeout

/**
 * @param {Object} appConfig
 * @param {Boolean} forceUpdate
 */
export async function startTask (appConfig, forceUpdate = false) {
  stopTask()
  if (appConfig.autoUpdateSubscribes && appConfig.serverSubscribes.length) {
    if (forceUpdate) {
      await update(appConfig)
    }
    // hour
    const intervalTime = appConfig.subscribeUpdateInterval * 3600000
    try {
      if (!forceUpdate) {
        const content = await readFile(subscribeUpdateFile, 'utf8')
        lastUpdateTime = new Date(content.toString())
      }
      const nextUpdateTime = new Date(+lastUpdateTime + intervalTime)
      logger.info('next subscribe update time: %s', nextUpdateTime)
      timeout(nextUpdateTime, intervalTime, appConfig)
    } catch (e) {
      update(appConfig)
    }
  }
}

function timeout (nextUpdateTime, intervalTime, appConfig) {
  _timeout = setTimeout(() => {
    update(appConfig)
    interval(intervalTime, appConfig)
  }, nextUpdateTime - new Date())
}

function interval (intervalTime, appConfig) {
  _interval = setInterval(() => {
    update(appConfig)
  }, intervalTime)
}

async function saveUpdateTime () {
  const date = new Date()
  lastUpdateTime = date
  logger.info('last update time: %s', lastUpdateTime)
  return await writeFile(subscribeUpdateFile, date)
}

async function update (appConfig) {
  await saveUpdateTime()
  updateSubscribes()
}

export function updateSubscribes () {
  sendData(EVENT_SUBSCRIBE_UPDATE_MAIN)
}

export function stopTask () {
  if (_timeout) {
    clearTimeout(_timeout)
  }
  if (_interval) {
    clearInterval(_interval)
  }
}

appConfig$.subscribe(data => {
  const [appConfig, changed] = data
  if (changed.length === 0) {
    startTask(appConfig, true)
  } else {
    if (['autoUpdateSubscribes', 'subscribeUpdateInterval'].some(key => changed.indexOf(key) > -1)) {
      startTask(appConfig)
    }
  }
})
