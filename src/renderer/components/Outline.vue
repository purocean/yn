<template>
  <div class="outline-toc">
    <div v-if="(headings || heads).length < 1" class="empty">Empty</div>
    <div
      class="heading"
      v-for="(head, index) in (headings || heads)"
      :key="index"
      :class="head.class"
      :style="{paddingLeft: `${head.level + 1}em`}"
      @click="handleClickItem(head)">
      {{ head.text }}
      <span class="tag-name">{{head.tag}}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { registerHook, removeHook } from '@fe/core/hook'
import { revealLineInCenter } from '@fe/services/editor'
import { getHeadings, Heading } from '@fe/services/view'
import { defineComponent, onBeforeUnmount, ref } from 'vue'

export default defineComponent({
  name: 'outline',
  props: {
    headings: Array as () => Heading[],
    autoScroll: {
      type: Boolean,
      default: true,
    }
  },
  setup (props, { emit }) {
    function handleClickItem (heading: Heading) {
      emit('click-item', heading)
      if (props.autoScroll) {
        revealLineInCenter(heading.sourceLine)
      }
    }

    const heads = ref<Heading[]>([])

    function refresh () {
      if (props.headings) {
        heads.value = []
      } else {
        heads.value = getHeadings()
      }
    }

    registerHook('VIEW_RENDERED', refresh)

    onBeforeUnmount(() => {
      removeHook('VIEW_RENDERED', refresh)
    })

    return { heads, handleClickItem }
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
  .outline-toc > .heading:hover {
    background: rgba(255, 255, 255, 0.14);
  }
}
</style>
