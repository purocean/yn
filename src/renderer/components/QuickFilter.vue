<template>
  <teleport to="body">
    <div class="quick-filter-wrapper" @click="close">
      <div
        class="quick-filter"
        @click.stop
        :style="{
          top: props.top,
          right: props.right,
          bottom: props.bottom,
          left: props.left,
        }"
        @keypress.enter.exact="chooseItem()"
        @keydown.up.exact="selectItem(-1)"
        @keydown.down.exact="selectItem(1)"
      >
        <div class="input">
          <input
            ref="input"
            type="text"
            :placeholder="placeholder"
            v-model="keyword"
            v-if="!props.filterInputHidden"
            @keydown.up.prevent
            @keydown.down.prevent
            @keydown.esc="close"
            @blur="input?.focus()"
          />
        </div>
        <div ref="refList" class="list">
          <div
            v-for="item in list"
            :key="item.key"
            :class="{
              item: true,
              selected: selected && selected.key === item.key,
              current: item.key === props.current,
            }"
            @click="chooseItem(item)"
            @mouseover="updateSelected(item)"
          >
            {{ item.label }}
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import { Components } from '@fe/types'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

type Item = Components.QuickFilter.Item
type Props = Components.QuickFilter.Props

// eslint-disable-next-line no-undef
const props: Props = defineProps({
  top: String,
  right: String,
  bottom: String,
  left: String,
  placeholder: String,
  current: String,
  filterInputHidden: Boolean,
  list: {
    type: Array as () => Item[],
    required: true,
  },
})

const input = ref<HTMLInputElement | null>(null)
const refList = ref<HTMLElement | null>(null)
// eslint-disable-next-line no-undef
const emit = defineEmits(['close', 'choose', 'input'])
const keyword = ref('')
const selected = ref<Item | null>(null)
const list = computed(() => props.list.filter(
  item => item.label.toLowerCase().includes(keyword.value.toLowerCase())
))

function close () {
  emit('close')
}

onMounted(() => {
  input.value?.focus()
  updateSelected()
})

function updateSelected (item: Item | null = null) {
  if (item) {
    selected.value = item
  } else {
    selected.value = list.value.find(x => x.key === props.current) || null
  }

  nextTick(() => {
    if (refList.value) {
      const el = refList.value.querySelector<any>('.selected')
      el?.scrollIntoViewIfNeeded()
    }
  })
}

function selectItem (inc: number) {
  if (list.value.length < 1) {
    updateSelected()
    return
  }

  const currentIndex = list.value.findIndex((x: any) => selected.value === x)

  let index = currentIndex + inc
  if (index > list.value.length - 1) {
    index = 0
  } else if (index < 0) {
    index = list.value.length - 1
  }

  updateSelected(list.value[index])
}

function chooseItem (item: Item | null = null) {
  if (item) {
    emit('choose', item)
  } else if (selected.value) {
    emit('choose', selected.value)
  }

  close()
}

watch(() => keyword.value, (val) => {
  emit('input', val)
  updateSelected()
})

</script>

<style lang="scss" scoped>
.quick-filter-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  z-index: 1000;
}

.quick-filter {
  position: absolute;
  padding: 1px;
  margin: 0;
  background: var(--g-color-backdrop);
  border: 1px var(--g-color-84) solid;
  border-left: 0;
  border-top: 0;
  color: var(--g-foreground-color);
  min-width: 9em;
  max-width: 20em;
  cursor: default;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  overflow: hidden;
  backdrop-filter: var(--g-backdrop-filter);

  input[type="text"] {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    font-size: 16px;
    padding: 6px 10px;
    box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 2px;

    &:focus {
      background: rgba(var(--g-color-82-rgb), 0.5);
    }
  }

  .list {
    width: 100%;
    max-height: 70vh;
    overflow-y: auto;
    user-select: none;
    padding: 3px 1px;
    box-sizing: border-box;

    .item {
      padding: 0 16px;
      line-height: 1.9;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--g-color-20);
      border-radius: var(--g-border-radius);

      &.current {
        font-weight: bold;
        color: var(--g-color-5);
      }

      &.selected {
        background: var(--g-color-active-a);
        color: var(--g-color-5);
      }
    }
  }
}
</style>
