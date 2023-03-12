import { execSync } from 'child_process'
import { pathExistsSync } from 'fs-extra'
import { winToolPath, macToolPath } from './bootstrap'
import { currentConfig, appConfig$, updateAppConfig } from './data'
import logger from './logger'
import { isWin, isMac, isLinux, isOldMacVersion } from '../shared/env'

// check gsettings
let isGsettingsAvaliable = false
try {
  isGsettingsAvaliable = /gsettings$/.test(
    execSync('which gsettings')
      .toString()
      .trim()
  )
} catch (e) {}
let isProxyChanged = false

/**
 * @param {String} command
 */
function runCommand (command) {
  if (command) {
    isProxyChanged = true
    try {
      execSync(command)
    } catch (error) {
      logger.error(error)
    }
  }
}

function getLinuxDesktop () {
  let currentDesktop
  const xdgDesktop = execSync('echo $XDG_CURRENT_DESKTOP').toString().trim()
  if (/gnome$/i.test(xdgDesktop)) {
    currentDesktop = 'gnome'
  } else if (/cinnamon$/i.test(xdgDesktop)) {
    currentDesktop = 'cinnamon'
  } else if (/kde$/i.test(xdgDesktop)) {
    currentDesktop = 'kde'
  } else if (/xfce$/i.test(xdgDesktop)) {
    currentDesktop = 'xfce'
  }
  return currentDesktop
}

export function getLinuxTheme () {
  let currentTheme
  const currentDesktop = getLinuxDesktop()
  console.log(currentDesktop)
  if (currentDesktop === 'gnome') {
    currentTheme = execSync('dconf read /org/gnome/desktop/interface/gtk-theme').toString().trim()
  } else if (currentDesktop === 'cinnamon') {
    currentTheme = execSync('dconf read /org/cinnamon/desktop/interface/gtk-theme').toString().trim()
  } else if (currentDesktop === 'kde') {
    currentTheme = execSync('kreadconfig5 --group "KDE" --key "ColorScheme"').toString().trim()
  } else if (currentDesktop === 'xfce') {
    currentTheme = execSync('xfconf-query -lvc xsettings -p /Net/ThemeName').toString().trim()
  }
  console.log(currentTheme)
  return currentTheme
}

export function setProxyToNone (force = true) {
  if (force || isProxyChanged) {
    let command
    if (isWin && pathExistsSync(winToolPath)) {
      command = `${winToolPath} pac ""`
    } else if (isMac && pathExistsSync(macToolPath) && !isOldMacVersion) {
      command = `"${macToolPath}" -m off`
    } else if (isLinux && isGsettingsAvaliable) {
      command = `gsettings set org.gnome.system.proxy mode 'none'`
    }
    runCommand(command)
  }
}

export function setProxyToGlobal (host, port) {
  let command
  if (isWin && pathExistsSync(winToolPath)) {
    command = `${winToolPath} global ${host}:${port}`
  } else if (isMac && pathExistsSync(macToolPath) && !isOldMacVersion) {
    command = `"${macToolPath}" -m global -p ${port}`
  } else if (isLinux && isGsettingsAvaliable) {
    command = `gsettings set org.gnome.system.proxy mode 'manual' && gsettings set org.gnome.system.proxy.socks host '${host}' && gsettings set org.gnome.system.proxy.socks port ${port}`
  }
  runCommand(command)
}

export function setProxyToPac (pacUrl) {
  let command
  if (isWin && pathExistsSync(winToolPath)) {
    command = `${winToolPath} pac ${pacUrl}`
  } else if (isMac && pathExistsSync(macToolPath) && !isOldMacVersion) {
    command = `"${macToolPath}" -m auto -u ${pacUrl}`
  } else if (isLinux && isGsettingsAvaliable) {
    command = `gsettings set org.gnome.system.proxy mode 'auto' && gsettings set org.gnome.system.proxy autoconfig-url ${pacUrl}`
  }
  runCommand(command)
}

function setProxyByMode (mode) {
  if (mode === 0) {
    setProxyToNone()
  } else if (mode === 1) {
    setProxyToPac(`http://127.0.0.1:${currentConfig.pacPort}/proxy.pac`)
  } else if (mode === 2) {
    setProxyToGlobal('127.0.0.1', currentConfig.localPort)
  }
}

export function switchSystemProxy () {
  const nextMode = (currentConfig.sysProxyMode + 1) % 3
  updateAppConfig({ sysProxyMode: nextMode })
  setProxyByMode(nextMode)
}

export function startProxy (mode) {
  if (mode === undefined) {
    mode = currentConfig.sysProxyMode
  }
  setProxyByMode(mode)
}

appConfig$.subscribe(data => {
  const [appConfig, changed, , isProxyStarted] = data
  if (isProxyStarted) {
    if (!changed.length) {
      startProxy(appConfig.sysProxyMode)
    } else {
      if (appConfig.sysProxyMode === 1 && changed.indexOf('pacPort') > -1) {
        startProxy(1)
      } else if (appConfig.sysProxyMode === 2 && changed.indexOf('localPort') > -1) {
        startProxy(2)
      }
    }
  } else if (changed.length) {
    setProxyToNone()
  }
})
