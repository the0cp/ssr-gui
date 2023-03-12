import { ipcRenderer } from 'electron'
import { EVENT_APP_NOTIFY_RENDERER } from '../shared/events'

/**
 * @param {String} body
 * @param {String} title
 */
export function showHtmlNotification (body, title = 'Notification') {
  console.log('using html5 notification')
  new Notification(title, {
    body: body,
  })
}

/**
 * @param {String} body
 * @param {String} title
 */
export function showNotification (body, title = 'Notification') {
  ipcRenderer.send(EVENT_APP_NOTIFY_RENDERER, body, title)
}
