<template>
  <div class="options-container px-2 pb-2 scroll-y">
    <Alert v-if="showTip" type="info" closable @on-close="closeTip">Double click to edit. Enter to save, ESC to cancel</Alert>
    <fieldset class="px-1 py-1">
      <legend class="ml-1">encrypt method</legend>
      <edit-tag
        v-for="method in methods"
        :key="method"
        :name="method"
        @on-close="removeMethod"
        @on-update="v => updateMethod(method, v)"
      ></edit-tag>
      <Input
        v-model="method"
        class="create-input"
        placeholder="Enter to add"
        size="small"
        @keyup.enter.native="addMethod"
        icon="plus"
      />
    </fieldset>
    <fieldset class="mt-2 px-1 py-1">
      <legend class="ml-1">SSR protocols</legend>
      <EditTag
        v-for="protocol in protocols"
        :key="protocol"
        :name="protocol"
        @on-close="removeProtocol"
        @on-update="v => updateProtocol(protocol, v)"
      ></EditTag>
      <Input
        v-model="protocol"
        class="create-input"
        placeholder="Enter to add"
        size="small"
        @keyup.enter.native="addProtocol"
        icon="plus"
      />
    </fieldset>
    <fieldset class="mt-2 px-1 py-1">
      <legend class="ml-1">SSR obfs</legend>
      <EditTag
        v-for="obfs in obfses"
        :key="obfs"
        :name="obfs"
        @on-close="removeObfs"
        @on-update="v => updateObfs(obfs, v)"
      ></EditTag>
      <Input
        v-model="obfs"
        class="create-input"
        placeholder="Enter to add"
        size="small"
        @keyup.enter.native="addObfs"
        icon="plus"
      />
    </fieldset>
  </div>
</template>
<script>
import { mapState, mapMutations } from 'vuex'
import EditTag from '../../components/EditTag'
import { STORE_KEY_SSR_TIP } from '../../constants'
// const ls = window.localStorage
import { ls } from '../../store'
export default {
  data () {
    return {
      showTip: !ls.get(STORE_KEY_SSR_TIP),
      method: '',
      protocol: '',
      obfs: '',
    }
  },
  computed: {
    ...mapState(['methods', 'protocols', 'obfses']),
  },
  components: {
    EditTag,
  },
  methods: {
    ...mapMutations(['updateView', 'updateMethods', 'updateProtocols', 'updateObfses',]),
    closeTip () {
      ls.set(STORE_KEY_SSR_TIP, true)
    },
    addMethod () {
      if (this.method) {
        const clone = this.methods.slice()
        clone.push(this.method)
        this.updateMethods(clone)
        this.method = ''
      }
    },
    addProtocol () {
      if (this.protocol) {
        const clone = this.protocols.slice()
        clone.push(this.protocol)
        this.updateProtocols(clone)
        this.protocol = ''
      }
    },
    addObfs () {
      if (this.obfs) {
        const clone = this.obfses.slice()
        clone.push(this.obfs)
        this.updateObfses(clone)
        this.obfs = ''
      }
    },
    updateMethod (method, newVal) {
      const clone = this.methods.slice()
      const index = clone.indexOf(method)
      clone.splice(index, 1)
      clone.splice(index, 0, newVal)
      this.updateMethods(clone)
    },
    updateProtocol (protocol, newVal) {
      const clone = this.protocols.slice()
      const index = clone.indexOf(protocol)
      clone.splice(index, 1)
      clone.splice(index, 0, newVal)
      this.updateProtocols(clone)
    },
    updateObfs (obfs, newVal) {
      const clone = this.obfses.slice()
      const index = clone.indexOf(obfs)
      clone.splice(index, 1)
      clone.splice(index, 0, newVal)
      this.updateObfses(clone)
    },
    removeMethod (name) {
      const clone = this.methods.slice()
      clone.splice(clone.indexOf(name), 1)
      this.updateMethods(clone)
    },
    removeProtocol (name) {
      const clone = this.protocols.slice()
      clone.splice(clone.indexOf(name), 1)
      this.updateProtocols(clone)
    },
    removeObfs (name) {
      const clone = this.obfses.slice()
      clone.splice(clone.indexOf(name), 1)
      this.updateObfses(clone)
    },
  },
}
</script>
