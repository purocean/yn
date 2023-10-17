<template>
  <XMask :show="show" @close="cancel" @key-enter="inputType !== 'textarea' && ok()" :mask-closeable="false" esc-closeable>
    <div class="wrapper" :style="{width: modalWidth}" @click.stop>
      <h4>{{title}}</h4>
      <component v-if="component" :is="component" />
      <p class="content" v-if="content">{{content}}</p>
      <template v-if="type === 'input'">
        <textarea class="textarea" v-if="inputType === 'textarea'" ref="refInput" rows="5" :placeholder="inputHint" :readonly="inputReadonly" v-model="inputValue"></textarea>
        <input class="input" v-else ref="refInput" :type="inputType" :placeholder="inputHint" :readonly="inputReadonly" v-model="inputValue">
      </template>
      <div class="action">
        <component v-if="action" :is="action" />
        <template v-else>
          <button v-if="type !== 'alert'" class="btn tr" @click="cancel">{{ cancelText }}</button>
          <button class="btn primary tr" @click="ok">{{ okText }}</button>
        </template>
      </div>
    </div>
  </XMask>
</template>

<script lang="ts">
import { defineComponent, nextTick, ref, shallowRef } from 'vue'
import type { Components } from '@fe/types'
import { useI18n } from '@fe/services/i18n'
import XMask from './Mask.vue'

type ModalType = '' | 'confirm' | 'input' | 'alert'

export default defineComponent({
  name: 'modal-input',
  components: { XMask },
  setup () {
    const { t } = useI18n()

    const refInput = ref<HTMLInputElement | null>(null)

    const type = ref<ModalType>('')
    const show = ref(false)
    const title = ref('')
    const content = ref('')
    const okText = ref('')
    const cancelText = ref('')
    const component = shallowRef()
    const action = shallowRef()
    const inputType = ref('')
    const inputValue = ref('')
    const inputHint = ref('')
    const inputReadonly = ref(false)
    const modalWidth = ref<string | undefined>(undefined)

    let resolveFun: Function | null = null

    function handle (val: any) {
      show.value = false
      inputValue.value = ''
      component.value = undefined
      action.value = undefined

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

    function alert (params: Components.Modal.AlertModalParams): Promise<boolean> {
      type.value = 'alert'
      title.value = params.title || t('modal.info')
      content.value = params.content || ''
      okText.value = params.okText || t('ok')
      cancelText.value = params.cancelText || t('cancel')
      component.value = params.component
      action.value = params.action
      show.value = true
      modalWidth.value = params.modalWidth

      return new Promise(resolve => {
        resolveFun = resolve
      })
    }

    function confirm (params: Components.Modal.ConfirmModalParams): Promise<boolean> {
      type.value = 'confirm'
      title.value = params.title || t('modal.info')
      content.value = params.content || ''
      okText.value = params.okText || t('ok')
      cancelText.value = params.cancelText || t('cancel')
      component.value = params.component
      action.value = params.action
      show.value = true
      modalWidth.value = params.modalWidth

      return new Promise(resolve => {
        resolveFun = resolve
      })
    }

    function input (params: Components.Modal.InputModalParams): Promise<string | null> {
      type.value = 'input'
      title.value = params.title || t('modal.input-placeholder')
      content.value = params.content || ''
      okText.value = params.okText || t('ok')
      cancelText.value = params.cancelText || t('cancel')
      inputType.value = params.type || 'text'
      inputValue.value = params.value || ''
      inputHint.value = params.hint || ''
      inputReadonly.value = params.readonly || false
      modalWidth.value = params.modalWidth
      component.value = params.component
      action.value = undefined

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
      alert,
      input,
      type,
      show,
      title,
      content,
      okText,
      cancelText,
      component,
      action,
      inputType,
      inputValue,
      inputHint,
      inputReadonly,
      modalWidth,
    }
  },
})
</script>

<style scoped>
.wrapper {
  width: 400px;
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  margin: auto;
  padding: 10px;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  overflow-wrap: break-word;
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

p.content {
  color: var(--g-color-37);
  max-height: 200px;
  overflow-y: auto;
  overflow-wrap: break-word;
  padding: 4px 0;
  margin: 12px 0;
}
</style>
