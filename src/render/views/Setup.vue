<template>
  <AppView name="setup" class="px-2 bg-primary">
    <div class="flex flex-column flex-ai-center w-100">
      <div class="flex flex-ai-center w-100">
        <div class="flex-1 flex flex-ai-center flex-jc-end">
          <Checkbox v-model="sysSSR" @on-change="useSysSSR">Use build-in ssr-local</Checkbox>
        </div>
        <span class="mx-2">OR</span>
        <div class="flex-1 flex flex-ai-center">
          <Form ref="form" class="flex-1" :model="form" :rules="rules" inline>
            <FormItem prop="ssrPath" style="margin-bottom:0">
              <Button type="primary" class="w-6r" @click="selectPath">Manaul</Button>
              <Input v-model="form.ssrPath" readonly placeholder="Need ssr" style="width:180px" />
            </FormItem>
          </Form>
        </div>
      </div>
    </div>
  </AppView>
</template>
<script>
import { mapState, mapMutations } from 'vuex'
import { openDialog } from '../ipc'
import { isSSRPathAvaliable } from '../../shared/utils'

export default {
  data () {
    return {
      sysSSR: false,
      form: {
        ssrPath: '',
      },
      rules: {
        ssrPath: [
          { required: true, message: 'Choose ssr path' },
          {
            validator: (rule, value, callback) => {
              if (isSSRPathAvaliable(value)) {
                callback()
              } else {
                callback('Not Availible')
              }
            },
          },
        ],
      },
    }
  },
  computed: {
    ...mapState(['meta']),
  },
  methods: {
    ...mapMutations(['updateConfig']),
    useSysSSR (v) {
      if (v) {
        this.setup('builtin')
      }
    },
    selectPath () {
      this.manualDownload = false
      const ret = openDialog({
        properties: ['openDirectory'],
      })
      if (ret.filePaths && ret.filePaths.length) {
        this.form.ssrPath = ret.filePaths[0]
        this.$refs.form.validate(valid => {
          if (valid) {
            this.setup()
          }
        })
      }
    },
    setup (ssrPath) {
      this.updateConfig([{ ssrPath: ssrPath || this.form.ssrPath }, true])
      this.$emit('finished')
    },
  },
  created () {
    if (this.autoDownload) {
      this.autoStart()
    }
  },
}
</script>
<style lang="stylus">
@import '../assets/styles/variable'

.view-setup
  .ivu-spin-dot
    width 48px
    height @width
</style>
