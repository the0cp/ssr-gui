<template>
  <Form class="panel-group" ref="form" :model="form" :rules="rules" :label-width="80" inline>
    <FormItem label="Rename group" prop="server">
      <Input type="text" v-model="form.group" />
    </FormItem>
    <span>
      <Button :disabled="form.group === editingGroup.title" @click="form.group = editingGroup.title">Reset</Button>
      <Button class="ml-1" type="primary" @click="rename">Save</Button>
    </span>
  </Form>
</template>
<script>
import { mapState, mapActions, mapMutations } from 'vuex'
export default {
  data () {
    return {
      rules: {
        group: { required: true, message: 'Input name' },
      },
      form: {
        group: '',
      },
    }
  },
  computed: {
    ...mapState(['editingGroup', 'appConfig']),
  },
  watch: {
    'editingGroup.title' (v) {
      this.form.group = v
    },
  },
  methods: {
    ...mapMutations(['updateEditingGroup']),
    ...mapActions(['updateConfigs']),
    rename () {
      if (this.form.group !== this.editingGroup.title) {
        const clone = this.appConfig.configs.slice()
        clone.forEach(config => {
          if (config.group === this.editingGroup.title) {
            config.group = this.form.group
          }
        })
        this.updateConfigs(clone)
        this.updateEditingGroup({ updated: true, title: this.form.group })
      }
    },
  },
}
</script>
