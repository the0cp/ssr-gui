import path from 'path'
import { execFile } from 'child_process'
// import treeKill from 'tree-kill'
import { dialog } from 'electron'
import { appConfig$ } from './data'
import { isHostPortValid } from './port'
import logger from './logger'
import { isConfigEqual } from '../shared/utils'
import { showNotification } from './notification'
import { isWin } from '../shared/env'
let child

/**
 * @param {*String} command
 */
export function runCommand (command, params) {
  if (command && params.length) {
    const commandStr = `${command} ${params.join(' ')}`
    logger.info('run command: %s', commandStr.replace(/-k [\d\w]* /, '-k ****** '))
    child = execFile(command, params)
    child.stdout.on('data', logger.info)
    child.stderr.on('data', logger.error)
  }
}

/**
 * @param {*Object} config ssr config
 * @param {*String} ssrPath local.py
 * @param {*[Number|String]} localPort
 */
export async function run (appConfig) {
  const listenHost = appConfig.shareOverLan ? '0.0.0.0' : '127.0.0.1'
  await stop()
  try {
    await isHostPortValid(listenHost, appConfig.localPort || 1080)
  } catch (e) {
    logger.error(e)
    dialog.showMessageBox({
      type: 'warning',
      title: 'Warning',
      message: `Port ${appConfig.localPort} occupied`,
    })
  }
  const config = appConfig.configs[appConfig.index]
  // const params = [path.join(appConfig.ssrPath, 'local.py')]
  let ssrFile = isWin ? 'ssr-local.exe' : 'ssr-local'
  let ssrPath
  if (appConfig.ssrPath !== 'builtin') {
    ssrPath = appConfig.ssrPath
  } else {
    ssrPath = path.join(process.env.NODE_ENV === 'development' ? '.' : process.resourcesPath, 'ssr-n')
  }
  const command = path.join(ssrPath, ssrFile)
  const params = []
  params.push('-s')
  params.push(config.server)
  params.push('-p')
  params.push(config.server_port)
  params.push('-k')
  params.push(config.password)
  params.push('-m')
  params.push(config.method)
  params.push('-O')
  params.push(config.protocol)
  if (config.protocolparam) {
    params.push('-G')
    params.push(config.protocolparam)
  }
  if (config.obfs) {
    params.push('-o')
    params.push(config.obfs)
  }
  if (config.obfsparam) {
    params.push('-g')
    params.push(config.obfsparam)
  }
  params.push('-b')
  params.push(listenHost)
  params.push('-l')
  params.push(appConfig.localPort || 1080)
  if (config.timeout) {
    params.push('-t')
    params.push(config.timeout)
  }
  runCommand(command, params)
}

/**
 * kill command
 */
export function stop (force = false) {
  if (child && child.pid) {
    logger.log('Kill client')
    return new Promise((resolve, reject) => {
      child.once('close', () => {
        child = null
        if (timeout) {
          clearTimeout(timeout)
        }
        resolve()
      })
      const timeout = setTimeout(() => {
        logger.error(`Thread ${child.pid} may not closed`)
        !force && showNotification(`Thread ${child.pid} may not closed`)
        resolve()
      }, 5000)
      process.kill(child.pid, 'SIGKILL')
      // child.kill()
      // treeKill(child.pid, 'SIGKILL', err => {
      //   if (err) {
      //     reject(err)
      //   } else {
      //     // TODO: delay to ensure port not occupied
      //     setTimeout(() => {
      //       child = null
      //       resolve()
      //     }, 100)
      //   }
      // })
    })
  }
  return Promise.resolve()
}

/**
 * @param {Object} appConfig
 */
export function runWithConfig (appConfig) {
  if (appConfig.ssrPath && appConfig.enable && appConfig.configs && appConfig.configs[appConfig.index]) {
    run(appConfig)
  }
}

appConfig$.subscribe(data => {
  const [appConfig, changed, oldConfig] = data
  if (changed.length === 0) {
    runWithConfig(appConfig)
  } else {
    if (changed.indexOf('enable') > -1) {
      if (appConfig.enable) {
        runWithConfig(appConfig)
      } else {
        stop()
      }
    } else if (appConfig.enable) {
      if (['ssrPath', 'index', 'localPort', 'shareOverLan'].some(key => changed.indexOf(key) > -1)) {
        runWithConfig(appConfig)
      }
      if (changed.indexOf('configs') > -1) {
        if (!appConfig.configs.length) {
          stop()
        } else if (!oldConfig.configs.length) {
          runWithConfig(appConfig)
        } else if (!isConfigEqual(appConfig.configs[appConfig.index], oldConfig.configs[oldConfig.index])) {
          runWithConfig(appConfig)
        }
      }
    }
  }
})
