<template>
  <XMask :show="show" @close="cancel" @enter="ok" :mask-closeable="false" esc-closeable>
    <div class="wrapper" @click.stop>
      <h4>{{title}}</h4>
      <p v-if="content">{{content}}</p>
      <input v-if="type === 'input'" ref="input" :type="inputType" :placeholder="inputHint" v-model="inputValue">
      <div class="action">
        <button @click="cancel">取消</button>
        <button class="primary" @click="ok">确定</button>
      </div>
    </div>
  </XMask>
</template>

<script>
import XMask from './Mask'

export default {
  name: 'modal-input',
  components: { XMask },
  data () {
    return {
      type: '',
      show: false,
      title: '',
      content: '',
      inputType: '',
      inputValue: '',
      inputHint: '',
    }
  },
  methods: {
    handle (val) {
      this.show = false
      this.inputValue = ''
      try {
        this.resolve && this.resolve(val)
      } catch (error) {
        throw error
      } finally {
        this.resolve = null
      }
    },
    cancel () {
      this.handle(this.type === 'input' ? null : false)
    },
    ok () {
      this.handle(this.type === 'input' ? this.inputValue : true)
    },
    confirm ({ title, content }) {
      this.type = 'confirm'
      this.title = title || '提示'
      this.content = content || ''
      this.show = true

      return new Promise(resolve => {
        this.resolve = resolve
      })
    },
    input ({ type, title, hint, value, content }) {
      this.type = 'input'
      this.title = title || '请输入'
      this.content = content || ''
      this.inputType = type || 'text'
      this.inputValue = value || ''
      this.inputHint = hint || ''

      this.show = true
      this.$nextTick(() => {
        this.$refs.input.focus()
        this.$refs.input.select()
      })

      return new Promise(resolve => {
        this.resolve = resolve
      })
    }
  },
}
</script>

<style scoped>
.wrapper {
  width: 400px;
  background: #2b2a2a;
  margin: auto;
  padding: 10px;
}

input {
  display: block;
  width: 100%;
  margin: 0;
  border: 0;
  font-size: 18px;
  line-height: 1.4em;
  padding: 6px;
  box-sizing: border-box;
  background: #3a3939;
  color: #ddd;
  transition: all .1s ease-in-out;
}

.input:focus {
  background: #242222;
}

h4 {
  margin: 0;
  margin-bottom: 10px;
  color: #c7c7c7;
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

button {
  background: #4c4c4c;
  border: 0;
  padding: 5px 10px;
  color: #ccc;
  cursor: pointer;
  border-radius: 2px;
  transition: all .3s ease-in-out;
  margin-left: 10px;
}

button.primary {
  background: #71706e;
}

button:hover {
  background: #807d7d;
}

p {
  color: #bbbaba;
}
</style>
