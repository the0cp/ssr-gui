import fs from 'fs'
import path from 'path'
import Base64 from 'urlsafe-base64'
import { loadConfigsFromString } from './ssr'
import { isWin } from './env'

const STRING_PROTOTYPE = '[object String]'
const NUMBER_PROTOTYPE = '[object Number]'
const REGEXP_PROTOTYPE = '[object RegExp]'
const DATE_PROTOTYPE = '[object Date]'
const BOOL_PROTOTYPE = '[object Boolean]'
const ARRAY_PROTOTYPE = '[object Array]'
const OBJECT_PROTOTYPE = '[object Object]'
const FUNCTION_PROTOTYPE = '[object Function]'

function protoString (obj) {
  return Object.prototype.toString.call(obj)
}

export function isString (str) {
  return protoString(str) === STRING_PROTOTYPE
}

export function isNumber (num) {
  return protoString(num) === NUMBER_PROTOTYPE
}

export function isRegExp (reg) {
  return protoString(reg) === REGEXP_PROTOTYPE
}

export function isBool (bool) {
  return protoString(bool) === BOOL_PROTOTYPE
}

export function isDate (date) {
  return protoString(date) === DATE_PROTOTYPE
}

export function isArray (arr) {
  return protoString(arr) === ARRAY_PROTOTYPE
}

export function isObject (obj) {
  return protoString(obj) === OBJECT_PROTOTYPE
}

export function isFunction (fn) {
  return protoString(fn) === FUNCTION_PROTOTYPE
}

export function debounce (fn, delay) {
  let timer
  return function (...args) {
    timer && clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * Vue data merge
 * @param  {Object} to      object that want to be merget to
 * @param  {Object} origins origin object sources
 */
export function merge (to, ...origins) {
  origins.forEach(from => {
    for (const key in from) {
      const value = from[key]
      // Just merge existed property in origin data
      if (to[key] !== undefined) {
        switch (protoString(value)) {
          case OBJECT_PROTOTYPE:
            merge(to[key], value)
            break
          default:
            to[key] = value
            break
        }
      }
    }
  })
}

/**
 * @param {Object} to
 * @param {Object} from
 * @param {Boolean} appendArray
 */
export function configMerge (to, from, appendArray = false) {
  for (const key in from) {
    const value = from[key]
    switch (protoString(value)) {
      case OBJECT_PROTOTYPE:
        if (to[key] === undefined) {
          to[key] = value
        } else {
          configMerge(to[key], value, appendArray)
        }
        break
      case ARRAY_PROTOTYPE:
        if (appendArray) {
          Array.prototype.push.apply(to[key], from[key])
        } else {
          to[key] = from[key]
        }
        break
      default:
        to[key] = value
        break
    }
  }
}

/**
 * @param {Object} appConfig
 * @param {Object} targetConfig
 */
export function getUpdatedKeys (appConfig = {}, targetConfig) {
  return Object.keys(targetConfig).filter(key => {
    const value = targetConfig[key]
    if (protoString(appConfig[key]) !== protoString(value)) {
      return true
    }
    switch (protoString(value)) {
      case OBJECT_PROTOTYPE:
        return getUpdatedKeys(appConfig[key], value).length
      case ARRAY_PROTOTYPE:
        if (appConfig[key] === value) {
          return false
        }
        return (
          appConfig[key].length !== value.length ||
          appConfig[key].some((item, index) => getUpdatedKeys(item, value[index]).length > 0)
        )
      default:
        return appConfig[key] !== value
    }
  })
}

// deep assign
export function assign (to, ...origins) {
  origins.forEach(from => {
    if (!isObject(from)) {
      return
    }
    for (const key in from) {
      const value = from[key]
      switch (protoString(value)) {
        case OBJECT_PROTOTYPE:
          if (to[key] === undefined) {
            to[key] = {}
          }
          assign(to[key], value)
          break
        default:
          to[key] = value
          break
      }
    }
  })
  return to
}

// clone obj
export function clone (obj, deep = false) {
  if (obj === undefined || obj === null) {
    return
  }
  let r = {}
  switch (protoString(obj)) {
    case DATE_PROTOTYPE:
      return new Date(obj)
    case REGEXP_PROTOTYPE:
      return new RegExp(obj)
    case ARRAY_PROTOTYPE:
      return !deep ? obj.slice(0) : obj.map(item => clone(item))
    case OBJECT_PROTOTYPE:
      // const r = {}
      for (const key in obj) {
        r[key] = deep ? clone(obj[key], deep) : obj[key]
      }
      return r
    default:
      return obj
  }
}

export function isConfigEqual (config1, config2) {
  return (
    isObject(config1) &&
    isObject(config2) &&
    Object.keys(config1).every(key => {
      const validKeys = [
        'server',
        'server_port',
        'password',
        'method',
        'protocol',
        'protocolparam',
        'obfs',
        'obfsparam',
        'remarks',
        'group',
        'enable',
      ]
      if (validKeys.indexOf(key) > -1) {
        return config1[key] === config2[key]
      }
      return true
    })
  )
}

export function generateID () {
  const seed = 'ABCDEF01234567890'
  const arr = []
  for (let i = 0; i < 32; i++) {
    arr.push(seed[Math.floor(Math.random() * seed.length)])
  }
  return arr.join('')
}

export function groupConfigs (configs, selectedIndex) {
  const groups = {}
  const ungrouped = []
  configs.forEach((node, index) => {
    if (selectedIndex !== undefined) {
      node.checked = index === selectedIndex
    }
    if (node.group) {
      if (groups[node.group]) {
        groups[node.group].push(node)
      } else {
        groups[node.group] = [node]
      }
    } else {
      ungrouped.push(node)
    }
  })
  if (ungrouped.length) {
    groups['Ungrouped'] = ungrouped
  }
  return groups
}

/**
 * @param {*String} path
 */
export function isSSRPathAvaliable (folderPath) {
  // const localPyPath = path.join(folderPath, 'local.py')
  let ssrFile = isWin ? 'ssr-local.exe' : 'ssr-local'
  const localPyPath = path.join(folderPath, ssrFile)
  console.log(localPyPath, fs.existsSync(localPyPath))
  return fs.existsSync(localPyPath)
}

export function somePromise (promiseArr) {
  return new Promise((resolve, reject) => {
    let count = 0
    for (const p of promiseArr) {
      p.then(resolve).catch(() => {
        count++
        if (count === promiseArr.length) {
          reject()
        }
      })
    }
  })
}

/**
 * @param {String} url
 */
export function request (url, fromRenderer) {
  let _net
  if (fromRenderer) {
    _net = require('electron').remote.net
  } else {
    const { net } = require('electron')
    _net = net
  }
  return new Promise((resolve, reject) => {
    _net
      .request(url)
      .on('response', response => {
        const body = []
        response.on('data', chunk => {
          body.push(chunk.toString())
        })
        response.on('end', () => {
          const stringRes = body.join('')
          if (response.headers['content-type'] === 'application/json') {
            try {
              resolve(JSON.parse(stringRes))
            } catch (error) {
              resolve(stringRes)
            }
          } else {
            resolve(stringRes)
          }
        })
      })
      .on('error', reject)
      .end()
  })
}

export function isSubscribeContentValid (content) {
  if (!content) {
    return [false]
  }
  const decoded = Base64.decode(content).toString('utf-8')
  const configs = loadConfigsFromString(decoded)
  if (!configs.length) {
    return [false]
  } else {
    const groupConfigs = {}
    configs.forEach(config => {
      if (Object.prototype.hasOwnProperty.call(groupConfigs, config.group)) {
        groupConfigs[config.group].push(config)
      } else {
        groupConfigs[config.group] = [config]
      }
    })
    const groupCount = Object.keys(groupConfigs).length
    return [groupCount, groupCount > 0 ? groupConfigs : {}]
  }
}
