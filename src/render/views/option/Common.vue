<template>
  <div class="options-container px-2 pb-2 scroll-y">
    <Form ref="form" class="mt-1" :model="form" :rules="rules" :label-width="120">
      <FormItem prop="ssrPath" label="SSR-N path">
        <Input
          v-model="form.ssrPath"
          placeholder="Choose ssr path"
          @on-change="changeSSRPath"
          style="width:200px"
        />
        <Button type="primary" @click="selectPath">Browse</Button>
      </FormItem>
      <div class="flex">
        <FormItem class="flex-1" label="Auto Launch">
          <Checkbox v-model="form.autoLaunch" @on-change="update('autoLaunch')"/>
        </FormItem>
        <FormItem class="flex-1" label="Share over LAN">
          <Checkbox v-model="form.shareOverLan" @on-change="update('shareOverLan')"/>
        </FormItem>
        <FormItem class="flex-1" label="http proxy">
          <Checkbox v-model="form.httpProxyEnable" @on-change="update('httpProxyEnable')"/>
        </FormItem>
      </div>
      <div class="flex">
        <FormItem class="flex-1" label="PAC Port">
          <InputNumber v-model="form.pacPort" :min="0" :max="65535" @on-change="update('pacPort')"/>
        </FormItem>
        <FormItem class="flex-1" label="Local Port">
          <InputNumber v-model="form.localPort" :min="0" :max="65535" @on-change="update('localPort')" />
        </FormItem>
        <FormItem class="flex-1" label="http proxy port">
          <InputNumber v-model="form.httpProxyPort" :min="0" :max="65535" @on-change="update('httpProxyPort')" />
        </FormItem>
      </div>
    </Form>
  </div>
</template>
<script>
import { mapActions } from 'vuex'
import { isSSRPathAvaliable, debounce } from '../../../shared/utils'
import { openDialog } from '../../ipc'
export default {
  data () {
    const appConfig = this.$store.state.appConfig
    return {
      form: {
        ssrPath: appConfig.ssrPath,
        autoLaunch: appConfig.autoLaunch,
        shareOverLan: appConfig.shareOverLan,
        localPort: appConfig.localPort,
        pacPort: appConfig.pacPort,
        httpProxyEnable: appConfig.httpProxyEnable,
        httpProxyPort: appConfig.httpProxyPort,
      },
      rules: {
        ssrPath: [
          {
            validator: (rule, value, callback) => {
              if (isSSRPathAvaliable(value)) {
                callback()
              } else {
                callback('Path not availible')
              }
            },
          },
        ],
      },
    }
  },
  watch: {
    'appConfig.ssrPath' (v) {
      this.ssrPath = v
    },
    'appConfig.autoLaunch' (v) {
      this.autoLaunch = v
    },
    'appConfig.shareOverLan' (v) {
      this.shareOverLan = v
    },
    'appConfig.localPort' (v) {
      this.localPort = v
    },
    'appConfig.pacPort' (v) {
      this.pacPort = v
    },
  },
  methods: {
    ...mapActions(['updateConfig']),
    changeSSRPath () {
      this.$refs.form.validate(valid => {
        if (valid) {
          this.updateConfig({ ssrPath: this.form.ssrPath })
        }
      })
    },

    selectPath () {
      const path = openDialog({
        properties: ['openDirectory'],
      })
      if (path && path.length) {
        this.form.ssrPath = path[0]
        this.$refs.form.validate(valid => {
          if (valid) {
            this.updateConfig({ ssrPath: this.form.ssrPath })
          }
        })
      }
    },
    update: debounce(function (field) {
      if (this.form[field] !== this.$store.state.appConfig[field]) {
        this.updateConfig({ [field]: this.form[field] })
      }
    }, 1000),
  },
}
</script>
