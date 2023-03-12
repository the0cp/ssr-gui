<template>
  <AppView name="options" class="bg-primary">
    <Tabs class="flex-1 w-100" :value="view.tab" @on-click="name => updateView({ tab: name })">
      <TabPane label="General" name="common">
        <OptionCommon></OptionCommon>
      </TabPane>
      <TabPane label="SSR Options" name="ssr">
        <OptionSsr></OptionSsr>
      </TabPane>
      <TabPane label="Subs" name="subscribes">
        <OptionSubscribe></OptionSubscribe>
      </TabPane>
      <TabPane label="Shortcuts" name="shortcuts">
        <OptionShortcut></OptionShortcut>
      </TabPane>
    </Tabs>
    <div class="w-100 flex flex-jc-end px-2 py-1 border-1px-t">
      <Button class="w-6r mr-2" @click="$emit('back')">Back</Button>
      <Button class="w-6r" type="primary" @click="done">OK</Button>
    </div>
  </AppView>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { hideWindow } from '../ipc'
import OptionCommon from './option/Common'
import OptionSsr from './option/SSR'
import OptionSubscribe from './option/Subscribe'
import OptionShortcut from './option/Shortcut'

export default {
  name: 'Options',
  computed: {
    ...mapState(['view']),
  },
  components: { OptionCommon, OptionSsr, OptionSubscribe, OptionShortcut },
  methods: {
    ...mapMutations(['resetState', 'updateView']),
    done () {
      this.resetState()
      hideWindow()
    },
  },
}
</script>

<style lang="stylus">
@import '../assets/styles/variable'

.view-options
  .create-input
    width 8.75rem
  .options-container
    height calc(100vh - 102px)
  .url-input
    width 12rem
  .ivu-table
    .ivu-checkbox-wrapper
      margin-right 0
  .input-error
    .ivu-input
      border-color $color-error
      &:focus
        box-shadow 0 0 0 2px rgba($color-error, 0.2)
</style>
