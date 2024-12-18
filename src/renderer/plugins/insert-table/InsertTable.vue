<template>
  <div class="insert-table">
    <div class="insert-table-panel" @click="confirm">
      <div
        v-for="row in rows"
        :key="row"
        class="table-row"
      >
        <div
          v-for="col in cols"
          :key="col"
          class="table-cell"
          @mouseover="highlightCells(row, col)"
          :class="{ highlighted: isHighlighted(row, col) }"
        />
      </div>
    </div>
    <div class="right">
      <div class="options">
        <label>
          <input type="checkbox" v-model="compact" />
          {{ $t('insert-table.compact') }}
        </label>
      </div>
      <div class="inputs">
        <input type="number" v-model.lazy="highlightedCells.row" :min="1" :max="maxRows" :step="1" @change="checkValue" />
        <span>x</span>
        <input type="number" v-model.lazy="highlightedCells.col" :min="1" :max="maxCols" :step="1" @change="checkValue" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@fe/services/i18n'
import { ref, watchEffect } from 'vue'

useI18n()

const emit = defineEmits<{
  'confirm': [],
  'change': [{ rows: number, cols: number, compact: boolean }]
}>()

const rows = ref(10)
const cols = ref(10)
const compact = ref(false)
const min = 1
const maxRows = 999
const maxCols = 99

const highlightedCells = ref({ row: 2, col: 3 })

const highlightCells = (row: number, col: number) => {
  highlightedCells.value = { row, col }
}

const isHighlighted = (row: number, col: number) => {
  return row <= highlightedCells.value.row && col <= highlightedCells.value.col
}

const checkValue = () => {
  if (highlightedCells.value.row < min) {
    highlightedCells.value.row = min
  } else if (highlightedCells.value.row > maxRows) {
    highlightedCells.value.row = maxRows
  }

  if (highlightedCells.value.col < min) {
    highlightedCells.value.col = min
  } else if (highlightedCells.value.col > maxCols) {
    highlightedCells.value.col = maxCols
  }
}

const confirm = () => {
  emit('confirm')
}

watchEffect(() => {
  emit('change', {
    rows: highlightedCells.value.row,
    cols: highlightedCells.value.col,
    compact: compact.value
  })
})
</script>

<style scoped lang="scss">
.insert-table {
  display: flex;
  align-items: flex-end;
}

.insert-table-panel {
  display: grid;
  gap: 2px;
  flex: none;
}

.table-row {
  display: flex;
}

.table-cell {
  width: 15px;
  height: 15px;
  border: 1px solid var(--g-color-50);
  border-radius: 3px;
  margin: 1px;
}

.table-cell.highlighted {
  border-color: #007bff;
  background-color: #007bff1d;
}

.right {
  display: flex;
  flex-direction: column;
  margin-left: auto;

  .options {
    margin-bottom: 10px;
  }

  .inputs {
    display: flex;
    width: 160px;
    flex: none;
    align-items: center;

    span {
      margin: 7px;
    }
  }
}

</style>
