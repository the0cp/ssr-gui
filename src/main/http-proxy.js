import proxyServer from 'simple-web-proxy'
import httpShutdown from 'http-shutdown'
import { dialog } from 'electron'
import { appConfig$ } from './data'
import { isHostPortValid } from './port'
import logger from './logger'

let server

httpShutdown.extend()

/**
 * @param {Object} appConfig
 */
export function startHttpProxyServer (appConfig, isProxyStarted) {
  if (isProxyStarted && appConfig.httpProxyEnable) {
    const host = appConfig.shareOverLan ? '0.0.0.0' : '127.0.0.1'
    isHostPortValid(host, appConfig.httpProxyPort)
      .then(() => {
        server = proxyServer({
          listenHost: host,
          listenPort: appConfig.httpProxyPort,
          socksPort: appConfig.localPort,
        })
          .withShutdown()
          .on('listening', () => {
            logger.info(`http proxy server listen at: ${host}:${appConfig.httpProxyPort}`)
          })
          .on('connect:error', err => {
            logger.error(`http proxy server connect error: ${err}`)
          })
          .once('error', err => {
            logger.error(`http proxy server error: ${err}`)
            server.shutdown()
          })
      })
      .catch(() => {
        dialog.showMessageBox({
          type: 'warning',
          title: 'Warning',
          message: `http port ${appConfig.httpProxyPort} occupied`,
        })
      })
  }
}

export async function stopHttpProxyServer () {
  if (server && server.listening) {
    return new Promise((resolve, reject) => {
      server.shutdown(err => {
        if (err) {
          logger.warn(`close http proxy server error: ${err}`)
          reject()
        } else {
          logger.info('http proxy server closed.')
          resolve()
        }
      })
    })
  }
  return Promise.resolve()
}

appConfig$.subscribe(data => {
  const [appConfig, changed, , isProxyStarted, isOldProxyStarted] = data
  if (changed.length === 0) {
    startHttpProxyServer(appConfig, isProxyStarted)
  } else {
    if (
      ['shareOverLan', 'httpProxyEnable', 'httpProxyPort'].some(key => changed.indexOf(key) > -1) ||
      isProxyStarted !== isOldProxyStarted
    ) {
      stopHttpProxyServer().then(() => {
        startHttpProxyServer(appConfig, isProxyStarted)
      })
    }
  }
})
