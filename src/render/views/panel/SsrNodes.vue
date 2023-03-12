<template>
  <div class="panel-nodes flex flex-column h-100">
    <Tree
      class="node-tree flex-1 px-1 bg-white"
      :class="{ 'empty-tree': !appConfig.configs.length }"
      empty-text="Add a node first"
      :enable-cancel-select="false"
      :data="groupedNodes"
      :render="treeRender"
      @on-select-change="onSelect"
      @on-dbclick-node="onNodeDBClick"
      ref="tree"
    ></Tree>
    <div class="flex mt-1 flex-jc-center">
      <ButtonGroup class="w-6r mr-1 flex-inline">
        <Button class="flex-1" type="primary" @click="create">Add</Button>
        <Dropdown trigger="click" placement="top-end">
          <Button class="ivu-dropdown-btn-trigger" type="primary" icon="md-arrow-dropdown"></Button>
          <DropdownMenu slot="list">
            <DropdownItem @click.native="copyFromClipboard">Import from Clipboard</DropdownItem>
            <DropdownItem @click.native="toSubscribe">Add sub</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </ButtonGroup>
      <Poptip v-if="selectedGroupName" confirm title="Delete all?" @on-ok="removeGroup">
        <Button class="w-6r" :disabled="disabled.remove">Delete</Button>
      </Poptip>
      <Button v-else class="w-6r" type="primary" @click="applyNode">Apply</Button>
    </div>
    <div class="flex mt-1 flex-jc-center">
      <Button class="w-6r mr-1" :disabled="disabled.remove" @click="remove">Del</Button>
      <Button class="w-6r mr-1" :disabled="disabled.up" @click="updown(1)">Up</Button>
      <Button class="w-6r" :disabled="disabled.down" @click="updown(-1)">Down</Button>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'
import { hideWindow } from '../../ipc'
import Config from '../../../shared/ssr'
import { clone, groupConfigs } from '../../../shared/utils'
import { EVENT_CONFIG_COPY_CLIPBOARD } from '../../../shared/events'

let preventIndexAffect = false
export default {
  data () {
    return {
      buttonProps: {
        type: 'ghost',
        size: 'small',
      },
      selectedConfigId: this.$store.getters.selectedConfig ? this.$store.getters.selectedConfig.id : '',
      selectedGroupName: '',
      selectedNode: {},
    }
  },
  mounted () {
    if (this.appConfig.configs.length && this.appConfig.index) {
      let tree = this.$el.getElementsByClassName('node-tree')[0]
      let top = tree.scrollHeight * (this.appConfig.index / this.appConfig.configs.length) - tree.clientHeight / 2
      tree.scrollTop = Math.round(top)
    }
  },
  computed: {
    ...mapState(['appConfig', 'editingConfig', 'editingGroup']),
    ...mapGetters(['selectedConfig', 'isEditingConfigUpdated']),
    configs () {
      if (this.appConfig && this.appConfig.configs && this.appConfig.configs.length) {
        return this.appConfig.configs.map(config => {
          return this.cloneConfig(config, this.selectedGroupName ? false : config.id === this.selectedConfigId)
        })
      }
      return []
    },
    groupedConfigs () {
      return groupConfigs(this.configs)
    },
    groupedNodes () {
      return Object.keys(this.groupedConfigs).map(groupName => {
        const node = {
          title: groupName,
          expand: true,
          selected: groupName === this.selectedGroupName,
          children: this.groupedConfigs[groupName],
        }
        return node
      })
    },

    selectedConfigNode () {
      if (this.selectedConfigId) {
        return this.configs.find(config => config.id === this.selectedConfigId)
      }
      return null
    },

    disabled () {
      if (!this.selectedConfigId && !this.selectedGroupName) {
        return { remove: true, up: true, down: true }
      }
      if (this.selectedGroupName) {
        const index = this.groupedNodes.findIndex(node => node.title === this.selectedGroupName)
        const isUngrouped = this.selectedGroupName === 'Ungrouped'
        const isPrevUngrouped = index < 1 ? false : this.groupedNodes[index - 1].title === 'Ungrouped'
        const isNextUngrouped =
          index > this.groupedNodes.length - 2 ? false : this.groupedNodes[index + 1].title === 'Ungrouped'
        return {
          remove: isUngrouped,
          up: isUngrouped || isPrevUngrouped || index < 1,
          down: isUngrouped || isNextUngrouped || index > this.groupedNodes.length - 2,
        }
      }

      const currentGroup = this.selectedConfigNode.group || 'Ungrouped'
      const group = this.groupedConfigs[currentGroup]
      const inGroupIndex = group.indexOf(this.selectedConfigNode)
      return {
        remove: false,
        up: inGroupIndex <= 0,
        down: inGroupIndex >= group.length - 1,
      }
    },
  },
  watch: {
    'appConfig.index' () {
      if (preventIndexAffect) {
        preventIndexAffect = false
      } else {
        this.selectedGroupName = ''
        this.selectedConfigId = this.selectedConfig ? this.selectedConfig.id : ''
      }
    },
    'editingGroup.updated' (v) {
      if (v) {
        this.updateEditingGroup({ updated: false })
        this.selectedGroupName = this.editingGroup.title
      }
    },
    selectedConfigId () {
      this.setCurrentConfig(this.selectedConfigNode)
    },
  },
  methods: {
    ...mapMutations(['setCurrentConfig', 'updateEditingBak', 'updateEditingGroup', 'updateView', 'resetState']),
    ...mapActions(['updateConfigs', 'updateConfig']),
    cloneConfig (config, selected) {
      return {
        title: `${config.emoji || ''}${config.remarks || config.server} (${config.server}:${config.server_port})`,
        selected,
        ...config,
      }
    },
    treeRender (h, { data }) {
      if (this.appConfig && this.appConfig.configs && this.appConfig.configs.length &&
        data.id !== this.selectedConfigId &&
        data.id === this.appConfig.configs[this.appConfig.index].id)
        return h('span', {
          style: {
            display: 'inline-block',
            width: '100%'
          }
        }, [
          h('span', {
            style: {
              background: '#5c8cbd',
            }
          }, [
            h('span', '[√] '),
            h('span', data.title)
          ])
        ])
      else
        return h('span', {
          style: {
            display: 'inline-block',
            width: '100%'
          }
        }, [
          h('span', data.title)
        ])
    },

    setSelected (group, config) {
      this.selectedGroupName = group
      this.selectedConfigId = config
    },

    onSelect (selection) {
      if (selection.length > 0) {
        this.selectedNode = selection[0]
      } else {
        this.selectedNode.selected = true
      }
      const node = this.selectedNode
      if (!node.children) {
        this.setSelected('', node.id)
        this.updateEditingGroup({ show: false })
      } else {
        this.setSelected(node.title, '')
        this.updateEditingGroup({
          show: true,
          title: node.title === 'Ungrouped' ? '' : node.title,
        })
      }
    },

    // TODO: new iview tree double click
    onNodeDBClick (selection) {
      const node = selection[0]
      this.updateConfig({
        index: this.appConfig.configs.findIndex(config => config.id === node.id),
      })
      this.resetState()
      hideWindow()
    },
    applyNode () {
      if (this.editingConfig.isValid()) {
        if (this.isEditingConfigUpdated) {
          const copy = this.appConfig.configs.slice()
          const index = copy.findIndex(config => config.id === this.editingConfig.id)
          copy.splice(index, 1)
          copy.splice(index, 0, clone(this.editingConfig))
          this.updateEditingBak()
          this.updateConfigs(copy)
        } else {
          const node = this.$refs.tree.getSelectedNodes()[0]
          if (!node.children) {
            this.updateConfig({
              index: this.appConfig.configs.findIndex(config => config.id === node.id),
            })
            this.resetState()
          }
        }
      } else {
        window.alert('Config is not valid')
      }
    },
    flatNodeGroups (groups) {
      groups = groups || this.groupedNodes
      const flatArr = []
      groups.forEach(group => {
        flatArr.push(...group.children)
      })
      return flatArr
    },
    copyFromClipboard () {
      ipcRenderer.send(EVENT_CONFIG_COPY_CLIPBOARD)
    },
    toSubscribe () {
      this.updateView({ page: 'Options', tab: 'subscribes', active: true })
    },

    create () {
      const newConfig = new Config(this.selectedConfigNode)
      const clone = this.appConfig.configs.slice()
      clone.push(newConfig)
      this.updateConfigs(clone)
      this.setSelected('', newConfig.id)
      this.updateEditingGroup({ show: false })
    },

    removeGroup () {
      const clone = this.appConfig.configs.slice()
      this.updateConfigs(clone.filter(config => config.group !== this.selectedGroupName))
      this.setSelected('', this.selectedConfig ? this.selectedConfig.id : '')
      this.updateEditingGroup({ show: false })
    },

    remove () {
      const clone = this.appConfig.configs.slice()
      const index = clone.findIndex(config => config.id === this.selectedConfigId)
      clone.splice(index, 1)
      this.updateConfigs(clone)
      const next = clone[index]
      const prev = clone[index - 1]
      this.setSelected('', next ? next.id : prev ? prev.id : '')
    },

    updown (direction = 1) {
      const clone = this.groupedNodes.slice()
      if (this.selectedGroupName) {
        const index = clone.findIndex(node => node.title === this.selectedGroupName)
        const group = clone.splice(index, 1)
        clone.splice(direction === 1 ? index - 1 : index + 1, 0, group[0])
      } else {
        const currentGroup = this.selectedConfigNode.group || 'Ungrouped'
        const group = clone.find(node => node.title === currentGroup)
        const childrenClone = group.children.slice()
        const inGroupIndex = childrenClone.findIndex(node => node.id === this.selectedConfigId)
        childrenClone.splice(
          direction === 1 ? inGroupIndex - 1 : inGroupIndex + 1,
          0,
          childrenClone.splice(inGroupIndex, 1)[0]
        )
        group.children = childrenClone
      }
      preventIndexAffect = true
      this.updateConfigs(this.flatNodeGroups(clone))
    },
  },
}
</script>
<style lang="stylus">
@import '../../assets/styles/variable'

.panel-nodes
  width 12.5rem
  .ivu-dropdown-btn-trigger
    width 28px
    padding-left 4px
    padding-right @padding-left
    border-top-left-radius 0
    border-bottom-left-radius 0
  .empty-tree
    display flex
    justify-content center
    align-items center
  .node-tree
    border 1px solid $color-border
    border-radius 4px
    overflow-x hidden
    overflow-y auto
  .ivu-tree-children
    .ivu-tree-children
      .ivu-tree-arrow
        display none
</style>
