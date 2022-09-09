<template>
  <teleport to="body">
    <div class="quick-filter-wrapper" @click="close">
      <div
        class="quick-filter"
          @click.stop :style="{
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
          >
            {{ item.label }}
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import { computed, defineEmits, defineProps, nextTick, onMounted, ref, watch } from 'vue'

interface Item {
  label: string,
  key: string,
}

const props = defineProps({
  top: String,
  right: String,
  bottom: String,
  left: String,
  placeholder: String,
  current: String,
  list: {
    type: Array as () => Item[],
    required: true,
  },
})

const input = ref<HTMLInputElement | null>(null)
const refList = ref<HTMLElement | null>(null)
const emit = defineEmits(['close', 'choose'])
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
    selected.value = list.value.length > 0 ? list.value[0] : null
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

watch(() => keyword.value, () => {
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
  background: var(--g-color-82);
  border: 1px var(--g-color-84) solid;
  border-left: 0;
  border-top: 0;
  color: var(--g-foreground-color);
  min-width: 9em;
  max-width: 20em;
  cursor: default;
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  overflow: hidden;

  input[type="text"] {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    font-size: 16px;

    &:focus {
      background: var(--g-color-92);
    }
  }

  .list {
    width: 100%;
    max-height: 400px;
    overflow-y: auto;
    user-select: none;

    .item {
      padding: 0 16px;
      line-height: 2;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;

      &.current {
        font-weight: bold;
      }

      &.selected {
        background: var(--g-color-75);
      }

      &:hover {
        background: var(--g-color-70);
      }
    }
  }
}
</style>
