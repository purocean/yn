<template>
  <XMask :show="show" @close="cancel" @key-enter="inputType !== 'textarea' && ok()" :mask-closeable="false" esc-closeable>
    <div class="wrapper" :style="{width: modalWidth}" @click.stop>
      <h4>{{title}}</h4>
      <p v-if="content">{{content}}</p>
      <template v-if="type === 'input'">
        <textarea class="textarea" v-if="inputType === 'textarea'" ref="refInput" rows="5" :placeholder="inputHint" v-model="inputValue"></textarea>
        <input class="input" v-else ref="refInput" :type="inputType" :placeholder="inputHint" v-model="inputValue">
      </template>
      <div class="action">
        <button class="btn" @click="cancel">取消</button>
        <button class="btn primary" @click="ok">确定</button>
      </div>
    </div>
  </XMask>
</template>

<script lang="ts">
import { defineComponent, nextTick, ref } from 'vue'
import XMask from './Mask.vue'
import { Components } from '@fe/support/types'

type ModalType = '' | 'confirm' | 'input'

export default defineComponent({
  name: 'modal-input',
  components: { XMask },
  setup () {
    const refInput = ref<HTMLInputElement | null>(null)

    const type = ref<ModalType>('')
    const show = ref(false)
    const title = ref('')
    const content = ref('')
    const inputType = ref('')
    const inputValue = ref('')
    const inputHint = ref('')
    const modalWidth = ref<string | undefined>(undefined)

    let resolveFun: Function | null = null

    function handle (val: any) {
      show.value = false
      inputValue.value = ''

      try {
        resolveFun && resolveFun(val)
      } finally {
        resolveFun = null
      }
    }

    function cancel () {
      handle(type.value === 'input' ? null : false)
    }

    function ok () {
      handle(type.value === 'input' ? inputValue.value : true)
    }

    function confirm (params: Components.Modal.ConfirmModalParams): Promise<boolean> {
      type.value = 'confirm'
      title.value = params.title || '提示'
      content.value = params.content || ''
      show.value = true
      modalWidth.value = undefined

      return new Promise(resolve => {
        resolveFun = resolve
      })
    }

    function input (params: Components.Modal.InputModalParams): Promise<string> {
      type.value = 'input'
      title.value = params.title || '请输入'
      content.value = params.content || ''
      inputType.value = params.type || 'text'
      inputValue.value = params.value || ''
      inputHint.value = params.hint || ''
      modalWidth.value = params.modalWidth

      show.value = true

      nextTick(() => {
        refInput.value!.focus()

        if (params.select) {
          refInput.value!.select()
          if (Array.isArray(params.select)) {
            refInput.value!.setSelectionRange(...params.select)
          }
        }
      })

      return new Promise(resolve => {
        resolveFun = resolve
      })
    }

    return {
      refInput,
      ok,
      cancel,
      confirm,
      input,
      type,
      show,
      title,
      content,
      inputType,
      inputValue,
      inputHint,
      modalWidth,
    }
  },
})
</script>

<style scoped>
.wrapper {
  width: 400px;
  background: var(--g-color-95);
  margin: auto;
  padding: 10px;
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
}

textarea {
  max-width: 100%;
  min-width: 100%;
}

h4 {
  margin: 0;
  margin-bottom: 10px;
  color: var(--g-color-0);
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

p {
  color: var(--g-color-37);
}
</style>
