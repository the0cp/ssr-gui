<template>
  <div class="app-qrcode flex flex-column flex-ai-center flex-jc-center pos-r">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      width="280"
      height="280"
      :view-box.camel="`0 0 ${editingConfigQR.size} ${editingConfigQR.size}`"
      @contextmenu="onRightClick"
      ref="svg"
    >
      <path :d="editingConfigQR.path"></path>
    </svg>
    <ul
      v-if="contextmenu.show"
      class="contextmenu"
      v-clickoutside="clickoutside"
      :style="{
        left: contextmenu.left,
        right: contextmenu.right,
        top: contextmenu.top,
      }"
    >
      <li @click="copyImage">Copy Image</li>
      <li @click="copyLink">Copy Link</li>
    </ul>
    <div class="link flex flex-ai-center mt-1">
      <Checkbox v-model="isSSR">SSR Link</Checkbox>
      <i-input class="flex-1" ref="input" :value="editingConfigLink" readonly style="width:auto">
        <template slot="append">
          <Tooltip :content="copyTooltip" placement="top-end" :delay="300">
            <Button
              class="ivu-btn-icon-copy"
              icon="ios-copy"
              @click="copyLink"
              @mouseover.native="onCopyOver"
              @mouseout.native="onCopyOut"
            ></Button>
          </Tooltip>
        </template>
      </i-input>
    </div>
    <div class="flex mt-2 flex-jc-center">
      <Button class="w-6r" type="info" @click="gotoOptions">Options</Button>
      <!-- <Button class="w-6r" type="default" @click="cancel">Cancel</Button>
      <Button class="w-6r ml-3" type="primary" @click="save">OK</Button> -->
    </div>
    <div class="flex-as-end pos-r">
      <span class="text-sub-title">DarkMode: </span><i-switch size="small" v-model="isDark" @on-change="changeTheme" />
    </div>
  </div>
</template>
<script>
import { clipboard, nativeImage } from 'electron'
import qr from 'qr-image'
import clickoutside from 'view-design/src/directives/clickoutside'
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'
import { hideWindow } from '../../ipc'
import { clone, merge } from '../../../shared/utils'

const COPY_TOOLTIP = 'Click to copy Link'
const COPY_TOOLTIP_COPIED = 'Link copied'
export default {
  data () {
    return {
      isSSR: true,
      copyTooltip: COPY_TOOLTIP,
      copied: false,
      timeout: null,
      contextmenu: {
        show: false,
        left: 'auto',
        right: 'auto',
        top: '0px',
      },
    }
  },
  computed: {
    ...mapState(['appConfig', 'editingConfig', 'theme']),
    ...mapGetters(['isEditingConfigUpdated']),
    editingConfigLink () {
      return this.isSSR ? this.editingConfig.getSSRLink() : this.editingConfig.getSSLink()
    },
    editingConfigQR () {
      return qr.svgObject(this.editingConfigLink)
    },
    isDark: {
      get: function () {
        return this.theme == 'dark'
      },
      set: function () {

      }
    }
  },
  directives: {
    clickoutside,
  },
  methods: {
    ...mapMutations(['resetState', 'updateEditingBak']),
    ...mapActions(['updateConfigs']),
    copyImage () {
      const self = this
      const base64Image = `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(this.$refs.svg))}`
      const img = new Image()
      const canvas = document.createElement('canvas')
      img.width = canvas.width = 280
      img.height = canvas.height = 280
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, 280, 280)
      img.src = base64Image
      img.onload = function () {
        ctx.drawImage(img, 0, 0, 280, 280)
        clipboard.writeImage(nativeImage.createFromDataURL(canvas.toDataURL()))
        self.$Message.success('QR Code copied')
      }
      this.contextmenu.show = false
    },
    copyLink () {
      this.copied = true
      this.copyTooltip = COPY_TOOLTIP_COPIED
      clipboard.writeText(this.editingConfigLink)
      this.$nextTick(() => {
        this.$refs.input.focus()
      })
      this.contextmenu.show = false
    },
    onCopyOver () {
      if (this.timeout) {
        clearTimeout(this.timeout)
        this.timeout = null
      }
    },
    onCopyOut () {
      this.timeout = setTimeout(() => {
        this.copyTooltip = COPY_TOOLTIP
      }, 500)
    },
    onRightClick (e) {
      const showOnRight = e.layerX < 180
      merge(this.contextmenu, {
        show: true,
        left: showOnRight ? `${e.layerX + 4}px` : 'auto',
        right: showOnRight ? 'auto' : `${284 - e.layerX}px`,
        top: `${e.layerY + 4}px`,
      })
    },
    clickoutside () {
      this.contextmenu.show = false
    },
    gotoOptions () {
      // this.resetState()
      // hideWindow()
      this.$store.commit('nextView')
    },
    cancel () {
      this.resetState()
      hideWindow()
    },
    save () {
      if (this.editingConfig.isValid()) {
        if (this.isEditingConfigUpdated) {
          const copy = this.appConfig.configs.slice()
          const index = copy.findIndex(config => config.id === this.editingConfig.id)
          copy.splice(index, 1)
          copy.splice(index, 0, clone(this.editingConfig))
          this.updateEditingBak()
          this.updateConfigs(copy)
        } else {
          hideWindow()
        }
      } else {
        window.alert('Config not valid')
      }
    },
    changeTheme (status) {
      const theme = status ? 'dark' : 'light'
      this.$store.commit('updateTheme', theme)
    }
  },
}
</script>
<style lang="stylus">
@import '../../assets/styles/variable'

.app-qrcode
  .tip
    line-height 0
    color $color-text
  .contextmenu
    color $color-text
    position absolute
    display block
    margin 0
    padding 2px 0
    min-width 6rem
    list-style none
    background-color #color-context-bg
    box-shadow 2px 2px 4px rgba(0, 0, 0, 0.5)
    z-index 999
    li
      padding 4px 16px
      cursor pointer
      &:hover
        background-color #f1f1f1
</style>
