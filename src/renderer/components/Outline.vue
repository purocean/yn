<template>
  <div ref="container" class="outline-toc">
    <div v-if="heads.length < 1" class="empty">Empty</div>
    <div
      v-for="(head, index) in heads"
      :key="index"
      :class="head.class"
      :style="{paddingLeft: `${head.level + 1}em`}"
      :data-activated="head.activated"
      @click="handleClickItem(head)">
      {{ head.text }}
      <span class="tag-name">{{head.tag}}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { throttle } from 'lodash-es'
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { registerHook, removeHook } from '@fe/core/hook'
import { revealLineInCenter } from '@fe/services/editor'
import { DOM_ATTR_NAME } from '@fe/support/constant'
import { AppState } from '@fe/support/store'
import { getHeadings, getViewDom, Heading } from '@fe/services/view'

export default defineComponent({
  name: 'outline',
  setup () {
    const container = ref<HTMLElement>()
    const heads = ref<Heading[]>([])
    const store = useStore<AppState>()

    function handleClickItem (heading: Heading) {
      const line = heading.sourceLine
      if (store.state.showEditor && !store.state.presentation) {
        revealLineInCenter(line)
      } else {
        getViewDom()
          ?.querySelector<HTMLElement>(`.markdown-body [${DOM_ATTR_NAME.SOURCE_LINE_START}="${line}"]`)
          ?.scrollIntoView()
      }
    }

    function refresh () {
      heads.value = getHeadings(true)

      if (!container.value || container.value.clientWidth < 50) {
        return
      }

      nextTick(() => {
        // skip on hover
        if (container.value?.parentElement?.querySelector('.outline-toc:hover') !== container.value) {
          const idx = heads.value.findIndex(head => head.activated)
          const item: any = container.value?.children.item(idx)
          if (item) {
            item.scrollIntoViewIfNeeded(false)
          }
        }
      })
    }

    const throttleRefresh = throttle(refresh, 150)

    onMounted(() => {
      refresh()
      registerHook('VIEW_RENDERED', throttleRefresh)
      registerHook('VIEW_SCROLL', throttleRefresh)
    })

    onBeforeUnmount(() => {
      removeHook('VIEW_RENDERED', throttleRefresh)
      removeHook('VIEW_SCROLL', throttleRefresh)
    })

    return { container, heads, handleClickItem }
  },
})
</script>

<style lang="scss" scoped>
@import '@fe/styles/mixins.scss';

.outline-toc {
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 16px;
  user-select: none;

  & > .empty {
    text-align: center;
    padding-top: 4em;
    font-size: 20px;
    color: var(--g-color-40);
    font-weight: lighter;
  }

  & > .heading {
    font-size: 14px;
    line-height: 18px;
    padding: 7px .5em;
    display: flex;
    border-radius: var(--g-border-radius);
    cursor: pointer;
    overflow-wrap: break-word;

    &[data-activated="true"] {
      background: rgba(0, 0, 0, 0.05);
    }

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    &.tag-h1 {
      font-weight: bold;
    }

    .tag-name {
      color: var(--g-color-60);
      font-size: 12px;
      padding-left: 0.5em;
    }
  }
}

@include dark-theme {
  .outline-toc > .heading {
    &[data-activated="true"] {
      background: rgba(255, 255, 255, 0.07);
    }

    &:hover {
      background: rgba(255, 255, 255, 0.14);
    }
  }
}
</style>
