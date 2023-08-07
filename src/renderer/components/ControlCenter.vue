<template>
  <teleport to="body">
    <div v-if="visible && schema" class="control-center" v-fixed-float="{ onClose: (byClickSelf: any) => !byClickSelf && toggle(false) }">
      <div v-for="(row, category) in schema" :key="category" class="row">
        <template v-for="(item, i) in row?.items" :key="i">
          <div
            v-if="item.type === 'btn'"
            :class="{ btn: true, flat: item.flat, disabled: item.disabled, checked: item.checked }"
            :title="item.title"
            @click.stop="item.onClick"
          >
            <svg-icon :name="item.icon" />
          </div>
          <component v-if="item.type === 'custom'" :is="item.component" />
        </template>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref } from 'vue'
import { registerAction, removeAction } from '@fe/core/action'
import { Alt, Escape, getKeysLabel } from '@fe/core/command'
import { ControlCenter, FileTabs } from '@fe/services/workbench'
import { t } from '@fe/services/i18n'
import type { Components } from '@fe/types'
import SvgIcon from './SvgIcon.vue'

const visible = ref(false)
const schema = ref<Components.ControlCenter.Schema | null>(null)

function toggle (val?: boolean) {
  visible.value = typeof val === 'boolean' ? val : !visible.value
}

registerAction({
  name: 'control-center.refresh',
  handler () {
    schema.value = ControlCenter.getSchema()
  }
})

registerAction({
  name: 'control-center.toggle',
  description: t('command-desc.control-center_toggle'),
  forUser: true,
  handler: toggle,
  keys: [Alt, 'c']
})

registerAction({
  name: 'control-center.hide',
  handler: () => toggle(false),
  keys: [Escape],
  when: () => visible.value
})

const tabsActionBtnTapper = (btns: Components.Tabs.ActionBtn[]) => {
  btns.push({ type: 'separator', order: 9999 })
  btns.push({
    type: 'normal',
    icon: 'sliders-solid',
    title: t('control-center.control-center', getKeysLabel('control-center.toggle')),
    onClick: () => toggle(),
    order: 9999,
  })
}

FileTabs.tapActionBtns(tabsActionBtnTapper)

onBeforeUnmount(() => {
  removeAction('control-center.refresh')
  removeAction('control-center.toggle')
  removeAction('control-center.hide')
  FileTabs.removeActionBtnTapper(tabsActionBtnTapper)
})
</script>

<style lang="scss" scoped>
.control-center {
  position: fixed;
  right: 14px;
  top: 36px;
  z-index: 1000;
  outline: none;
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  color: var(--g-color-10);
  overflow: hidden;
  border-radius: var(--g-border-radius);
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;

  .row {
    display: flex;
    max-width: 180px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--g-color-70);

    &:last-of-type {
      border-bottom: none;
      justify-content: space-between;
    }

    .btn {
      width: 36px;
      height: 36px;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      font-size: 14px;

      border-radius: var(--g-border-radius);
      margin: 4px 4.3px;
      transition: .1s ease-in-out;

      &.flat {
        width: 44px;
        height: 44px;
        margin: 0;
      }

      &.checked {
        background: var(--g-color-active-b);
      }

      .svg-icon {
        width: 16px;
        height: 16px;
      }

      &:not(.disabled):not(.checked):hover {
        background: var(--g-color-active-a);
      }

      &.disabled {
        color: var(--g-color-50);
        cursor: default;
      }
    }
  }
}

:root[electron="true"] .control-center {
  top: 66px;
}
</style>
