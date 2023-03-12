<template>
  <AppView name="feature" class="bg-primary">
    <h1>ShadowsocksR-Native</h1>
    <Row type="flex" :gutter="24" class="mt-64">
    </Row>
    <!-- <div class="flex flex-ai-center mt-64">
      <Checkbox v-model="autoDownload" @on-change="updateAutoDownload">Auto update</Checkbox>
      <Tooltip placement="top" content="auto download python ssr" style="margin-top:2px">
        <Icon color="#495060" type="help-circled"></Icon>
      </Tooltip>
    </div> -->
    <Button type="primary" class="w-6r mt-1" @click="done">Start</Button>
  </AppView>
</template>
<script>
import IconCross from '../assets/icon_cross_platform.svg'
import IconFunctions from '../assets/icon_functions.svg'
import IconOpen from '../assets/icon_open_source.svg'
import { STORE_KEY_FEATURE, STORE_KEY_AUTO_DOWNLOAD } from '../constants'
import { ls } from '../store'
export default {
  data () {
    return {
      autoDownload: false,
    }
  },
  Components: {
    IconCross,
    IconFunctions,
    IconOpen,
  },
  methods: {
    updateAutoDownload (v) {
      ls.set(STORE_KEY_AUTO_DOWNLOAD, v ? '1' : '0')
    },
    done () {
      ls.set(STORE_KEY_FEATURE, 'read')
      this.$emit('finished')
    },
  },
  created () {
    this.updateAutoDownload(true)
  },
}
</script>
<style lang="stylus">
@import '../assets/styles/variable.styl'

.view-feature
  .mt-64
    margin-top 64px
  .col
    width 240px
  svg
    width 40px
    height 40px
    > path
      fill $color-primary
</style>
