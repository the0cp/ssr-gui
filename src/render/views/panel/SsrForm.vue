<template>
  <Form class="panel-form" ref="form" :model="editingConfig" :rules="rules" :label-width="88">
    <FormItem label="Server" prop="server">
      <Input type="text" :value="editingConfig.server" @input="v => onInput('server', v)"/>
    </FormItem>
    <FormItem label="Port" prop="server_port">
      <InputNumber :value="editingConfig.server_port" @input="v => onInput('server_port', v)"/>
    </FormItem>
    <FormItem prop="password">
      <span slot="label">
        <Checkbox v-model="passwordVisiable" style="margin-right">pwd</Checkbox>
      </span>
      <Input
        :type="passwordVisiable ? 'text' : 'password'"
        :value="editingConfig.password"
        @input="v => onInput('password', v)"
      />
    </FormItem>
    <FormItem label="Method" prop="method">
      <Select :value="editingConfig.method" @input="v => onInput('method', v)">
        <Option v-for="method in methods" :key="method" :value="method">{{ method }}</Option>
      </Select>
    </FormItem>
    <FormItem label="Protocol" prop="protocol">
      <Select :value="editingConfig.protocol" @input="v => onInput('protocol', v)">
        <Option v-for="protocol in protocols" :key="protocol" :value="protocol">{{ protocol }}</Option>
      </Select>
    </FormItem>
    <FormItem label="Params">
      <Input :value="editingConfig.protocolparam" @input="v => onInput('protocolparam', v)" />
    </FormItem>
    <FormItem label="obfs" prop="obfs">
      <Select :value="editingConfig.obfs" @input="v => onInput('obfs', v)" @on-change="onObfsChange">
        <Option v-for="obfs in obfses" :key="obfs" :value="obfs">{{ obfs }}</Option>
      </Select>
    </FormItem>
    <FormItem label="obfs params">
      <Input
        :disabled="editingConfig.obfs === 'plain'"
        :value="editingConfig.obfsparam"
        @input="v => onInput('obfsparam', v)"
      />
    </FormItem>
    <FormItem label="Remarks">
      <Input :value="editingConfig.remarks" @input="v => onInput('remarks', v)"/>
    </FormItem>
    <FormItem label="Group">
      <AutoComplete
        :data="filteredGroups"
        clearable
        placeholder="Ungrouped"
        placement="top"
        :value="editingConfig.group"
        @input="v => onInput('group', v)"
      />
    </FormItem>
  </Form>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'SsrForm',
  data () {
    return {
      rules: {
        server: { required: true },
        server_port: { required: true },
        password: { required: true },
        method: { required: true },
        protocol: { required: true },
        obfs: { required: true },
      },
      passwordVisiable: false,
      groupText: '',
    }
  },
  computed: {
    ...mapState(['appConfig', 'editingConfig', 'methods', 'protocols', 'obfses']),
    groups () {
      if (this.appConfig && this.appConfig.configs && this.appConfig.configs.length) {
        const groups = []
        this.appConfig.configs.forEach(config => {
          if (config.group) {
            if (groups.indexOf(config.group) < 0) {
              groups.push(config.group)
            }
          }
        })
        return groups
      } else {
        return []
      }
    },
    filteredGroups () {
      if (!this.editingConfig.group) {
        return this.groups
      }
      return this.groups.filter(item => item.indexOf(this.editingConfig.group) > -1)
    },
  },
  methods: {
    onInput (field, v) {
      this.$store.commit('updateEditing', { [field]: v })
    },
    onObfsChange (v) {
      this.onInput('obfs', v)
      if (v === 'plain') {
        this.onInput('obfsparam', '')
      }
    },
  },
}
</script>

<style lang="stylus">
.panel-form
  .ivu-form-item
    margin-bottom 4px
  .ivu-input-number
    width 100%
  .ivu-select-dropdown
    max-height 140px
</style>
