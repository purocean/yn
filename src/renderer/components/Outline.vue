<template>
  <div ref="container" class="outline-toc">
    <input
      v-if="showFilter"
      class="search-input"
      type="text"
      v-model="keyword"
      :placeholder="$t('quick-open.input-placeholder')"
    />
    <div v-if="heads.length < 1" class="empty">Empty</div>
    <div
      v-for="(head, index) in heads"
      :key="index"
      :class="head.class"
      :style="{paddingLeft: `${head.level}em`}"
      :data-activated="activatedLine > -1 ? head.sourceLine === activatedLine : head.activated"
      :title="head.text"
      @click="handleClickItem(head)">
      <span class="heading-title">{{ head.text }}</span>
      <span class="tag-name">{{head.tag}}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { throttle } from 'lodash-es'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { registerHook, removeHook } from '@fe/core/hook'
import { getEditor, highlightLine } from '@fe/services/editor'
import { useI18n } from '@fe/services/i18n'
import { DOM_ATTR_NAME } from '@fe/support/args'
import { AppState } from '@fe/support/store'
import { getHeadings, getViewDom, Heading } from '@fe/services/view'

export default defineComponent({
  name: 'outline',
  props: {
    showFilter: {
      type: Boolean,
      default: false,
    },
  },
  setup () {
    const container = ref<HTMLElement>()
    const _heads = ref<Heading[]>([])
    const store = useStore<AppState>()
    const keyword = ref('')
    const activatedLine = ref(-1)

    useI18n()

    let disableRefresh: any = null

    function handleClickItem (heading: Heading) {
      activatedLine.value = heading.sourceLine

      if (disableRefresh) {
        clearTimeout(disableRefresh)
      }

      disableRefresh = setTimeout(() => {
        disableRefresh = null
      }, 1000)

      const line = heading.sourceLine
      const el = getViewDom()?.querySelector<HTMLElement>(`.markdown-body [${DOM_ATTR_NAME.SOURCE_LINE_START}="${line}"]`)
      const scrollEditor = store.state.showEditor && !store.state.presentation
      const scrollPreview = !scrollEditor || !store.state.syncScroll

      if (scrollEditor) {
        getEditor().revealLineNearTop(line)
      }

      if (scrollPreview) {
        el?.scrollIntoView()
      }

      // highlight heading
      if (el) {
        const disposeHighlight = highlightLine(line)

        el.style.backgroundColor = 'rgba(255, 183, 0, 0.6)'
        setTimeout(() => {
          disposeHighlight()
          el.style.backgroundColor = ''
          if (el.getAttribute('style') === '') {
            el.removeAttribute('style')
          }
        }, 1000)
      }
    }

    function refresh () {
      if (disableRefresh) {
        return
      }

      _heads.value = getHeadings(true)
      activatedLine.value = -1

      if (!container.value || container.value.clientWidth < 50) {
        return
      }

      nextTick(() => {
        // skip on hover
        if (container.value?.parentElement?.querySelector('.outline-toc:hover') !== container.value) {
          const idx = _heads.value.findIndex(head => head.activated)
          const item: any = container.value?.children.item(idx)
          if (item) {
            item.scrollIntoViewIfNeeded(false)
          }
        }
      })
    }

    const throttleRefresh = throttle(refresh, 150)

    const heads = computed(() => {
      if (keyword.value) {
        return _heads.value.filter(
          head => (head.tag + '\t' + head.text).toLowerCase().includes(keyword.value.toLowerCase())
        )
      }

      return _heads.value
    })

    onMounted(() => {
      refresh()
      registerHook('VIEW_RENDERED', throttleRefresh)
      registerHook('VIEW_SCROLL', throttleRefresh)
    })

    onBeforeUnmount(() => {
      removeHook('VIEW_RENDERED', throttleRefresh)
      removeHook('VIEW_SCROLL', throttleRefresh)
    })

    return { keyword, container, heads, activatedLine, handleClickItem }
  },
})
</script>

<style lang="scss" scoped>
@import '@fe/styles/mixins.scss';

input.search-input[type="text"] {
  border-radius: 0;
  background: rgba(var(--g-color-85-rgb), 0.5);
  font-size: 14px;
  padding: 6px 14px;
  position: sticky;
  top: 0;
  backdrop-filter: var(--g-backdrop-filter);
  box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 2px;

  &:focus {
    background: rgba(var(--g-color-85-rgb), 0.5);
    box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 4px;
  }
}

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
    padding: 5px .5em;
    display: flex;
    border-radius: var(--g-border-radius);
    cursor: pointer;
    overflow-wrap: break-word;
    color: var(--g-color-10);

    &[data-activated="true"],
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--g-color-0);
    }

    &.tag-h1 {
      font-weight: bold;
      padding-left: 1em !important;
    }

    .heading-title {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
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
    &[data-activated="true"],
    &:hover {
      background: rgba(255, 255, 255, 0.07);
    }
  }
}
</style>
