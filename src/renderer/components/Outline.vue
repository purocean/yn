<template>
  <div ref="container" :class="{'outline-toc': true, 'enable-collapse': !disableCollapse}" @click.capture="focusInput">
    <input
      v-if="showFilter"
      ref="refInput"
      class="search-input"
      type="text"
      v-model="keyword"
      @keydown.up.prevent="changeCurrentIdx(-1)"
      @keydown.down.prevent="changeCurrentIdx(1)"
      @keydown.enter.prevent="chooseCurrentItem()"
      @keydown.right.prevent="heads && toggleExpand(heads[currentIdx], true)"
      @keydown.left.prevent="heads && toggleExpand(heads[currentIdx], false)"
      :placeholder="$t('quick-open.input-placeholder')"
    />
    <div v-if="heads && heads.length < 1" class="empty">Empty</div>
    <div
      v-for="(head, index) in (heads || [])"
      :key="index"
      :class="{[head.class]: true, expanded: head.expanded}"
      :style="{paddingLeft: `${head.level + (disableCollapse ? 0 : 0.6)}em`}"
      :data-activated="activatedLine > -1 ? head.sourceLine === activatedLine : head.activated"
      :data-current="index === currentIdx"
      :data-level="head.level"
      :title="head.text"
      @click="handleClickItem(head, index)">
      <svg-icon v-if="enableCollapse && head.level > 0 && head.hasChildren" class="expand-icon" name="chevron-down" width="11px" @click.stop="toggleExpand(head)" />
      <span class="heading-title">{{ head.text }}</span>
      <span class="tag-name">{{head.tag}}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { throttle } from 'lodash-es'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useStore } from 'vuex'
import { registerHook, removeHook } from '@fe/core/hook'
import type { AppState } from '@fe/support/store'
import { highlightLine as editorHighlightLine } from '@fe/services/editor'
import { isSameFile } from '@fe/services/document'
import { useI18n } from '@fe/services/i18n'
import { getHeadings, getRenderEnv, Heading, highlightLine as viewHighlightLine } from '@fe/services/view'
import SvgIcon from './SvgIcon.vue'

type RenderHeading = Heading & {
  hasChildren: boolean
  expanded: boolean
}

export default defineComponent({
  name: 'outline',
  props: {
    showFilter: {
      type: Boolean,
      default: false,
    },
    enableCollapse: {
      type: Boolean,
      default: false,
    },
  },
  components: { SvgIcon },
  setup (props) {
    const container = ref<HTMLElement>()
    const _heads = shallowRef<Heading[] | null>(null)
    const store = useStore<AppState>()
    const keyword = ref('')
    const activatedLine = ref(-1)
    const refInput = ref<HTMLInputElement>()
    const currentIdx = ref(-1)
    const expanded = ref<Record<string, boolean>>({})

    useI18n()

    let disableRefresh: any = null

    function handleClickItem (heading: Heading, index: number) {
      focusInput()
      setCurrentIdx(-index - 10)

      activatedLine.value = heading.sourceLine

      if (disableRefresh) {
        clearTimeout(disableRefresh)
      }

      disableRefresh = setTimeout(() => {
        disableRefresh = null
      }, 1000)

      const line = heading.sourceLine
      const scrollEditor = store.state.showEditor && !store.state.presentation
      const scrollPreview = !scrollEditor || !store.state.syncScroll

      if (isSameFile(getRenderEnv()?.file, store.state.currentFile)) {
        editorHighlightLine(line, scrollEditor, 1000)
        viewHighlightLine(line, scrollPreview, 1000)
      } else {
        viewHighlightLine(line, true, 1000)
      }
    }

    function refresh () {
      if (disableRefresh) {
        return
      }

      _heads.value = getHeadings(true)
      activatedLine.value = -1
      setCurrentIdx(-1)

      if (!container.value || container.value.clientWidth < 50) {
        return
      }

      nextTick(() => {
        // skip on hover
        if (container.value?.parentElement?.querySelector('.outline-toc:hover') !== container.value) {
          const idx = heads.value?.findIndex(head => head.activated)
          if (idx === 0) {
            // for outline of sidebar
            container.value!.scrollTop = 0
          }

          const item: any = container.value?.querySelector('div.heading[data-activated="true"]')
          if (item) {
            item.scrollIntoViewIfNeeded(false)
          }
        }
      })
    }

    function setCurrentIdx (idx: number) {
      currentIdx.value = idx

      if (idx < 0 || !heads.value || idx >= heads.value.length) {
        return
      }

      nextTick(() => {
        const item: any = container.value?.querySelector('div.heading[data-current="true"]')
        if (item) {
          item.scrollIntoViewIfNeeded(false)
        }
      })
    }

    function changeCurrentIdx (offset: number) {
      if (!heads.value) {
        return
      }

      if (currentIdx.value < -1) {
        currentIdx.value = currentIdx.value * -1 - 10
      }

      let idx = currentIdx.value + offset
      if (idx < 0) {
        idx = heads.value.length - 1
      } else if (idx >= heads.value.length) {
        idx = 0
      }

      setCurrentIdx(idx)
    }

    function chooseCurrentItem () {
      if (!heads.value) {
        return
      }

      if (currentIdx.value < 0 || currentIdx.value >= heads.value.length) {
        return
      }

      handleClickItem(heads.value[currentIdx.value], currentIdx.value)
    }

    function focusInput () {
      refInput.value?.focus({ preventScroll: true })
    }

    function toggleExpand (head?: RenderHeading, val?: boolean) {
      if (head && head.hasChildren) {
        const key = head.text + head.level
        expanded.value[key] = val ?? !isExpanded(head)
      }
    }

    function isExpanded (head: Heading) {
      const key = head.text + head.level
      return expanded.value[key] ?? true
    }

    function hasChildren (head: Heading, list: Heading[], index: number) {
      return index + 1 < list.length && list[index + 1].level > head.level
    }

    const throttleRefresh = throttle(refresh, 150, { trailing: true })
    const disableCollapse = computed(() => !props.enableCollapse || !!keyword.value)

    const heads = computed<RenderHeading[] | null>(() => {
      const list = _heads.value

      if (!list) {
        return null
      }

      if (keyword.value) {
        return list.filter(
          head => (head.tag + '\t' + head.text).toLowerCase().includes(keyword.value.toLowerCase())
        ).map(x => ({
          ...x,
          hasChildren: false,
          expanded: true,
        }))
      } else if (props.enableCollapse) {
        // hide children of collapsed heading
        const results: RenderHeading[] = []
        const length = list.length

        for (let i = 0; i < length; i++) {
          const head = list[i]
          results.push({
            ...head,
            hasChildren: hasChildren(head, list, i),
            expanded: isExpanded(head),
          })

          if (!isExpanded(head)) {
            while (i + 1 < length && list[i + 1].level > head.level) {
              i++
            }
          }
        }

        return results
      } else {
        return list.map(x => ({
          ...x,
          hasChildren: false,
          expanded: true,
        }))
      }
    })

    watch(keyword, () => {
      currentIdx.value = -1
      nextTick(() => {
        const item: any = container.value?.querySelector('div.heading:first-of-type')
        if (item) {
          item.scrollIntoViewIfNeeded()
        }
      })
    })

    const clear = () => {
      keyword.value = ''
      _heads.value = null
      expanded.value = {}
    }

    onMounted(() => {
      refresh()
      refInput.value?.focus()
      registerHook('VIEW_RENDERED', throttleRefresh)
      registerHook('VIEW_SCROLL', throttleRefresh)
      registerHook('DOC_SWITCHED', clear)
    })

    onBeforeUnmount(() => {
      removeHook('VIEW_RENDERED', throttleRefresh)
      removeHook('VIEW_SCROLL', throttleRefresh)
      removeHook('DOC_SWITCHED', clear)
    })

    return { refInput, keyword, container, heads, activatedLine, currentIdx, handleClickItem, setCurrentIdx, changeCurrentIdx, chooseCurrentItem, disableCollapse, toggleExpand, focusInput }
  },
})
</script>

<style lang="scss" scoped>
input.search-input[type="text"] {
  border-radius: 0;
  background: var(--g-color-backdrop);
  font-size: 14px;
  padding: 6px 14px;
  position: sticky;
  top: 0;
  backdrop-filter: var(--g-backdrop-filter);
  box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 2px;
  margin-bottom: 6px;
  z-index: 1;

  &:focus {
    background: rgba(var(--g-color-90-rgb), 0.75);
    box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 4px;
  }
}

.outline-toc {
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 16px;
  user-select: none;
  scroll-padding-top: 32px;

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
    cursor: pointer;
    overflow-wrap: break-word;
    color: var(--g-color-10);
    position: relative;

    &[data-current="true"] {
      outline: 1px solid var(--g-color-anchor);
      outline-offset: -3px;
    }

    &[data-activated="true"] {
      background: var(--g-color-active-b);
      color: var(--g-color-0);
    }

    &:hover {
      background: var(--g-color-active-a);
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
      color: var(--g-color-50);
      font-size: 12px;
      padding-left: 0.5em;
    }
  }
}

.enable-collapse {
  .expand-icon {
    position: absolute;
    width: 18px;
    height: 18px;
    margin-left: -24px;
    margin-top: -4px;
    transform: rotate(-90deg);
    transform-origin: center;
    transition: transform 0.1s;
    color: var(--g-color-50);
    border: 4px solid transparent;
    border-left-width: 8px;
    border-right-width: 8px;

    &:hover {
      color: var(--g-color-10);
    }
  }

  .expanded {
    .expand-icon {
      transform: rotate(0);
    }
  }
}

</style>
