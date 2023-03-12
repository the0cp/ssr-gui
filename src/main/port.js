import { createServer } from 'net'
import logger from './logger'

/**
 * @param {String} host
 * @param {Number|String} port
 */
export function isHostPortValid (host, port) {
  return new Promise((resolve, reject) => {
    const tester = createServer()
      .listen(port, host)
      .once('error', err => {
        logger.debug(err)
        reject(err)
      })
      .once('listening', () => {
        let closed = false
        tester.close(() => {
          closed = true
          if (timeout) {
            clearTimeout(timeout)
          }
          resolve()
        })
        const timeout = setTimeout(() => {
          if (!closed) {
            reject('Timeout when release port.')
          }
        }, 5000)
      })
  })
}

/**
 * @param {Number|String} port
 */
export function isPortValid (port) {
  return Promise.all([isHostPortValid('0.0.0.0', port), isHostPortValid('127.0.0.1', port)])
}
