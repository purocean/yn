<template>
  <div class="content-right-side-panel">
    <div class="panel-header">
      <div
        :class="{'panel-title': true, clickable: panels.length > 1}"
        :title="currentPanel?.displayName"
        @click="showPanelSwitcher"
      >
        <span class="title-text">{{ currentPanel?.displayName }}</span>
        <svg-icon v-if="panels.length > 1" class="dropdown-icon" name="chevron-down" width="10px" />
      </div>
      <div class="panel-actions">
        <template v-for="btn in actionBtns" :key="btn.type === 'separator' ? undefined : btn.key">
          <div v-if="btn.type === 'separator' && !btn.hidden" class="action-separator"></div>
          <div
            v-else-if="btn.type === 'normal' && !btn.hidden"
            class="action-btn"
            :title="btn.title"
            @click="btn.onClick"
          >
            <svg-icon :name="btn.icon" width="12px" />
          </div>
        </template>
        <div v-if="actionBtns.length > 0" class="action-separator"></div>
        <div class="action-btn" :title="$t('close')" @click="hide">
          <svg-icon name="times" width="10px" />
        </div>
      </div>
    </div>
    <div class="panel-content">
      <keep-alive>
        <component v-if="keepAlivePanel" :is="keepAlivePanel.component" :key="keepAlivePanel.name" />
      </keep-alive>
      <component v-if="nonKeepAlivePanel" :is="nonKeepAlivePanel.component" :key="nonKeepAlivePanel.name" />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { registerHook, removeHook } from '@fe/core/hook'
import type { RightSidePanel, Components } from '@fe/types'
import store from '@fe/support/store'
import { ContentRightSide } from '@fe/services/workbench'
import { toggleContentRightSide } from '@fe/services/layout'
import { useQuickFilter } from '@fe/support/ui/quick-filter'
import { useI18n } from '@fe/services/i18n'
import { orderBy } from 'lodash-es'
import SvgIcon from './SvgIcon.vue'

export default defineComponent({
  name: 'content-right-side',
  components: { SvgIcon },
  setup () {
    useI18n()

    const titleRef = ref<HTMLElement>()

    const panels = shallowRef<RightSidePanel[]>(ContentRightSide.getAllPanels())

    const currentPanel = computed<RightSidePanel | null>(() => {
      const name = store.state.currentRightSidePanel
      if (!name) {
        return panels.value[0] || null
      }
      return panels.value.find(p => p.name === name) || panels.value[0] || null
    })

    const keepAlivePanel = computed<RightSidePanel | null>(() => {
      return currentPanel.value?.keepAlive ? currentPanel.value : null
    })

    const nonKeepAlivePanel = computed<RightSidePanel | null>(() => {
      return currentPanel.value && !currentPanel.value.keepAlive ? currentPanel.value : null
    })

    const actionBtns = computed<Components.RightSidePanel.ActionBtn[]>(() => {
      const btns = currentPanel.value?.actionBtns || []
      return orderBy(btns.filter(btn => !btn.hidden), x => x.order ?? 256, 'asc')
    })

    function switchPanel (name: string) {
      ContentRightSide.switchPanel(name)
    }

    function showPanelSwitcher (e: MouseEvent) {
      if (panels.value.length <= 1) {
        return
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      useQuickFilter().show({
        filterInputHidden: true,
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        list: panels.value.map(p => ({ key: p.name, label: p.displayName })),
        current: currentPanel.value?.name,
        onChoose: ({ key }) => {
          switchPanel(key)
        },
      })
    }

    function hide () {
      toggleContentRightSide(false)
    }

    function refresh () {
      panels.value = ContentRightSide.getAllPanels()
    }

    onMounted(() => {
      registerHook('RIGHT_SIDE_PANEL_CHANGE', refresh)
    })

    onBeforeUnmount(() => {
      removeHook('RIGHT_SIDE_PANEL_CHANGE', refresh)
    })

    return {
      titleRef,
      panels,
      currentPanel,
      keepAlivePanel,
      nonKeepAlivePanel,
      actionBtns,
      switchPanel,
      showPanelSwitcher,
      hide,
    }
  },
})
</script>

<style lang="scss" scoped>
.content-right-side-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 8px;
  border-bottom: 1px solid var(--g-color-86);
  background: var(--g-color-96);
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--g-color-20);
  overflow: hidden;
  min-width: 0;

  .title-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-icon {
    flex-shrink: 0;
    color: var(--g-color-40);
  }

  &.clickable {
    cursor: pointer;
    padding: 4px 6px;
    margin: -4px -6px;
    border-radius: 4px;

    &:hover {
      background: var(--g-color-90);
    }
  }
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--g-color-40);

  &:hover {
    background: var(--g-color-86);
    color: var(--g-color-0);
  }
}

.action-separator {
  width: 1px;
  height: 14px;
  background: var(--g-color-80);
  margin: 0 4px;
}

.panel-content {
  flex: 1;
  overflow: auto;
  height: 0;
}
</style>
