import os from 'os'
import { execSync } from 'child_process'

export const platform = os.platform()

export const isWin = platform === 'win32'
export const isMac = platform === 'darwin'
export const isLinux = platform === 'linux'

export let isPythonInstalled
try {
  isPythonInstalled = /^hello$/.test(
    execSync(`python3 -c "print('hello')"`)
      .toString()
      .trim()
  )
} catch (e) {
  // do nothing
}

export let macVersion
export let isOldMacVersion = false
if (isMac) {
  try {
    const result = execSync('sw_vers').toString()
    macVersion = result.match(/ProductVersion:[ \t]*([\d.]*)/)[1]
    const matchedVersion = [10, 11, 0]
    const splited = macVersion.split('.')
    for (let i = 0; i < splited.length; i++) {
      if (splited[i] > matchedVersion[i]) {
        isOldMacVersion = false
        break
      } else if (splited[i] < matchedVersion[i]) {
        isOldMacVersion = true
        break
      } else if (i === 2 && splited[i] === matchedVersion[i]) {
        isOldMacVersion = true
      }
    }
  } catch (error) {
    // do nothing
  }
}
