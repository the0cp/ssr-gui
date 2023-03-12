<template>
  <div class="options-container px-2 pb-2 scroll-y">
    <div class="flex pb-1">
      <Button type="primary" class="w-6r" @click="onCreate">Add</Button>
      <Button type="primary" class="w-6r ml-1" :disabled="selectedRows.length < 1" @click="update">Update</Button>
      <Button type="warning" class="w-6r ml-1" @click="remove" :disabled="selectedRows.length < 1">Delete</Button>
      <div class="ml-auto flex-inline flex-ai-center">
        <Input
          v-show="showNewUrl"
          class="mr-2 url-input"
          :class="{ 'input-error': urlError }"
          v-model="url"
          placeholder="Input valid URL"
          icon="plus"
          ref="input"
          @keyup.enter.native="save"
          @keyup.esc.native="cancel"
          @on-blur="cancel"
        />
        <Checkbox :value="appConfig.autoUpdateSubscribes" @on-change="onUpdateChange">Auto Update</Checkbox>
        <div v-if="appConfig.autoUpdateSubscribes" class="flex-inline flex-ai-center cycle-wrapper">
          <span>every &nbsp;</span>
          <Input :value="cycle.number" :maxlength="2" number @input="onChangeCycleNumber"/>
          <Select :value="cycle.unit" @input="onChangeCycleUnit">
            <Option value="hour">Hour(s)</Option>
            <Option value="day">Day(s)</Option>
            <Option value="week">Week(s)</Option>
          </Select>
          <span>&nbsp;Update</span>
        </div>
      </div>
    </div>
    <Table
      stripe
      border
      :columns="columns"
      :data="tableData"
      size="small"
      :loading="loading"
      no-data-text="No subs"
      height="252"
      @on-selection-change="selectRows"
      @on-row-dblclick="onRowDBClick"
    ></Table>
  </div>
</template>
<script>
import { mapState, mapMutations, mapActions } from 'vuex'
import { request, isSubscribeContentValid, somePromise } from '../../../shared/utils'

const URL_REGEX = /^https?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/
const unitMap = {
  hour: 1,
  day: 24,
  week: 168,
}
export default {
  data () {
    return {
      url: '',
      showNewUrl: false,
      urlError: false,
      loading: false,
      columns: [
        { type: 'selection', width: 54, align: 'center' },
        {
          title: 'Sub',
          key: 'URL',
          render: (h, params) => {
            const self = this
            const isEditing = params.index === this.editingRowIndex
            let element
            if (isEditing) {
              element = h('i-input', {
                ref: 'url',
                props: {
                  value: this.editingRowUrl,
                  placeholder: 'Input new URL',
                },
                attrs: {
                  id: 'editing-input',
                },
                on: {
                  'on-blur' () {
                    self.cancelEditing()
                  },
                },
                nativeOn: {
                  keyup (e) {
                    if (e.keyCode === 13) {
                      const url = e.target.value
                      if (url === self.appConfig.serverSubscribes[params.index].URL) {
                        self.cancelEditing()
                        return
                      }
                      self.loading = true
                      if (URL_REGEX.test(url)) {
                        self
                          .requestSubscribeUrl(url)
                          .then(res => {
                            self.loading = false
                            const [groupCount, groupConfigs] = isSubscribeContentValid(res)
                            if (groupCount > 0) {
                              const clone = self.appConfig.serverSubscribes.slice()
                              clone.splice(params.index, 1)
                              let groups = ''
                              let configs = []
                              for (const groupName in groupConfigs) {
                                groups = groups + groupName + '|'
                                configs = configs.concat(groupConfigs[groupName])
                              }
                              clone.splice(params.index, 0, {
                                URL: url,
                                Group: groups.slice(0, -1),
                              })
                              self.updateConfig({
                                serverSubscribes: clone,
                                configs: configs,
                              })
                            }
                          })
                          .catch(() => {
                            self.loading = false
                          })
                        self.cancelEditing()
                      } else {
                        self.editingUrlError = true
                      }
                    } else if (e.keyCode === 27) {
                      self.cancelEditing()
                    }
                  },
                },
              })
            } else {
              element = params.row.URL
            }
            return h('div', [element])
          },
        },
        { title: 'Group Name', key: 'Group', width: 320 },
      ],
      selectedRows: [],
      editingRowIndex: -1,
      editingRowUrl: '',
      editingUrlError: false,
    }
  },
  computed: {
    ...mapState(['appConfig']),
    tableData () {
      return this.appConfig.serverSubscribes
    },
    cycle () {
      const interval = this.appConfig.subscribeUpdateInterval
      const cycle = { number: 1, unit: 'hour' }
      if (interval % 24 === 0) {
        if (interval % 168 === 0) {
          cycle.unit = 'week'
          cycle.number = interval / 168
        } else {
          cycle.unit = 'day'
          cycle.number = interval / 24
        }
      } else {
        cycle.number = interval
      }
      return cycle
    },
  },
  watch: {
    url () {
      if (this.urlError) {
        this.urlError = false
      }
    },
    editingRowUrl () {
      if (this.editingUrlError) {
        this.editingUrlError = false
      }
    },
  },
  methods: {
    ...mapMutations(['updateView']),
    ...mapActions(['updateConfig', 'updateConfigs', 'updateSubscribes']),
    selectRows (rows) {
      this.selectedRows = rows
    },
    onRowDBClick (row, index) {
      if (this.editingRowIndex < 0) {
        this.editingRowIndex = index
        this.editingRowUrl = row.URL
      }
      this.$nextTick(() => {
        document
          .getElementById('editing-input')
          .querySelector('input')
          .focus()
      })
    },
    onUpdateChange (v) {
      this.updateConfig({ autoUpdateSubscribes: v })
    },
    onChangeCycleNumber (v) {
      const value = parseInt(v) || 1
      this.updateConfig({
        subscribeUpdateInterval: value * unitMap[this.cycle.unit],
      })
    },
    onChangeCycleUnit (v) {
      this.updateConfig({
        subscribeUpdateInterval: this.cycle.number * unitMap[v],
      })
    },
    update () {
      this.loading = true
      this.updateSubscribes(this.selectedRows).then(updatedCount => {
        this.loading = false
        this.$Message.success(`${updatedCount} node(s) updated`)
      })
    },
    remove () {
      const removeGroup = this.selectedRows.map(row => row.Group)
      const clone = this.appConfig.serverSubscribes.filter(config => removeGroup.indexOf(config.Group) < 0)
      this.updateConfig({ serverSubscribes: clone })
      this.selectedRows = []
    },

    requestSubscribeUrl (url) {
      return somePromise([request(url, true), fetch(url).then(res => res.text())])
    },

    updateSubscribedConfigs (configs) {
      const group = configs[0].group
      const notInGroup = this.appConfig.configs.filter(config => config.group !== group)
      this.updateConfigs(notInGroup.concat(configs))
    },
    onCreate () {
      this.showNewUrl = true
      this.$nextTick(() => {
        this.$refs.input.focus()
      })
    },
    cancel () {
      this.showNewUrl = false
      this.url = ''
      this.urlError = false
      this.updateView({ active: false })
    },
    cancelEditing () {
      this.editingRowIndex = -1
      this.editingRowUrl = ''
      this.editingUrlError = false
    },
    save () {
      if (URL_REGEX.test(this.url)) {
        this.loading = true
        const url = this.url

        if (
          this.appConfig.serverSubscribes.every(serverSubscribe => {
            return serverSubscribe.URL !== url
          })
        ) {
          this.requestSubscribeUrl(url)
            .then(res => {
              this.loading = false
              const [groupCount, groupConfigs] = isSubscribeContentValid(res)
              if (groupCount > 0) {
                const clone = this.appConfig.serverSubscribes.slice()
                let groups = ''
                let configs = []
                for (const groupName in groupConfigs) {
                  groups = groups + groupName + '|'
                  configs = configs.concat(groupConfigs[groupName])
                }
                clone.push({ URL: url, Group: groups.slice(0, -1) })
                this.updateConfig({
                  serverSubscribes: clone,
                  configs: this.appConfig.configs.concat(configs),
                })
              }
            })
            .catch(() => {
              this.loading = false
            })
        } else {
          this.loading = false
        }
        this.cancel()
      } else {
        this.urlError = true
      }
    },
  },
  mounted () {
    if (this.$store.state.view.active) {
      this.showNewUrl = true
      setTimeout(() => {
        this.$refs.input.focus()
      }, 300)
    }
  },
}
</script>
<style lang="stylus">
.options-container
  .cycle-wrapper
    .ivu-input-wrapper
      width auto
    .ivu-input
      padding 0
      width 24px
      height 24px
      border-left none
      border-top none
      border-right none
      border-radius 0
      text-align center
      &:focus
        box-shadow none
    .ivu-select
      width 24px
      height 24px
      &.ivu-select-visible
        .ivu-select-selection
          box-shadow none
      .ivu-select-selection
        height 24px
        border-left none
        border-top none
        border-right none
        border-radius 0
      .ivu-select-selected-value
        margin-right 0
        padding 0
        height 24px
        text-align center
        line-height 24px
      .ivu-select-arrow
        display none
      .ivu-select-dropdown
        .ivu-select-item
          padding-left 0
          padding-right 0
          text-align center
</style>
