<template>
  <div class="options-container px-2 pb-2 scroll-y">
    <Form ref="form" class="mt-1" :model="form" :label-width="0">
      <FormItem v-for="(funcText, funcName) in globalShortcutMaps" :key="funcName">
        <Row type="flex" :gutter="24">
          <i-col :span="5">
            <Checkbox v-model="form.globalShortcuts[funcName].enable" @on-change="update('globalShortcuts', funcName)"
              >{{ funcText }}
            </Checkbox>
          </i-col>
          <i-col :span="8">
            <Input
              v-model="form.globalShortcuts[funcName].key"
              readonly
              :disabled="!form.globalShortcuts[funcName].enable"
              @on-keydown="e => keydown(e, 'globalShortcuts', funcName)"
              @on-keyup="e => keyup(e, 'globalShortcuts', funcName)"
            />
          </i-col>
        </Row>
      </FormItem>
      <FormItem v-if="isLinux" class="flex-1">
        <Row type="flex" :gutter="24">
          <i-col :span="5">
            <Checkbox
              v-model="form.windowShortcuts.toggleMenu.enable"
              @on-change="update('windowShortcuts', 'toggleMenu')"
              >toggle menu
            </Checkbox>
          </i-col>
          <i-col :span="8">
            <i-input
              v-model="form.windowShortcuts.toggleMenu.key"
              readonly
              :disabled="!form.windowShortcuts.toggleMenu.enable"
              @on-keydown="e => keydown(e, 'windowShortcuts', 'toggleMenu')"
              @on-keyup="e => keyup(e, 'windowShortcuts', 'toggleMenu')"
            />
          </i-col>
        </Row>
      </FormItem>
    </Form>
  </div>
</template>
<script>
import { remote } from 'electron'
import { mapActions } from 'vuex'
import { changeBind } from '../../shortcut'
import { debounce } from '../../../shared/utils'
import { isLinux } from '../../../shared/env'

const globalShortcut = remote.globalShortcut

export default {
  data () {
    const appConfig = this.$store.state.appConfig
    return {
      isLinux,
      globalShortcutMaps: {
        toggleWindow: 'Show/Hide window',
        switchSystemProxy: 'Switch proxy mode',
      },
      form: {
        globalShortcuts: appConfig.globalShortcuts,
        windowShortcuts: appConfig.windowShortcuts,
      },
      funcKeys: new Set(),
      actionKey: '',
    }
  },
  methods: {
    ...mapActions(['updateConfig']),
    update: debounce(function (parent, field) {
      this.updateConfig({ [parent]: { [field]: this.form[parent][field] } })
    }, 1000),
    keydown: function (e) {
      e.preventDefault()
      if (e.metaKey) {
        this.funcKeys.add('Command')
      }
      if (e.ctrlKey) {
        this.funcKeys.add('Ctrl')
      }
      if (e.shiftKey) {
        this.funcKeys.add('Shift')
      }
      if (e.altKey) {
        this.funcKeys.add('Alt')
      }
      if ([16, 17, 18, 19, 91, 93].indexOf(e.keyCode) < 0) {
        this.actionKey = e.key.toUpperCase()
      }
    },
    keyup: function (e, parent, field) {
      if (this.funcKeys.size || this.actionKey) {
        const keys = Array.from(this.funcKeys)
        if (this.actionKey) {
          keys.push(this.actionKey)
        }
        const shortcutStr = keys.join('+')
        if (parent === 'globalShortcuts') {
          if (globalShortcut.isRegistered(shortcutStr)) {
            return this.$message.error(`Shortcut ${shortcutStr} already in use`)
          }
        } else {
          if (this.form[parent][field].key) {
            changeBind(field, this.form[parent][field].key, shortcutStr)
          }
        }
        this.form[parent][field].key = shortcutStr
        this.funcKeys.clear()
        this.actionKey = ''
        this.update(parent, field)
      }
    },
  },
}
</script>
