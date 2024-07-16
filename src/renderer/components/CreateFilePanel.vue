<template>
  <div class="create-file-panel">
    <div class="category-list-wrapper">
      <div class="category" v-for="category in xCategories" :key="category.category">
        <div v-if="categories.length > 1" class="category-title">{{ category.displayName }}</div>
        <div class="category-list">
          <template v-for="item in category.types" :key="item.id">
            <div
              class="category-item"
              @click="emits('updateDocType', item)"
            >
              <input type="radio" :checked="item.id === docType?.id" />
              {{ item.displayName }}({{ item.extension[0] }})
            </div>
          </template>
        </div>
      </div>
    </div>
    <div class="current-path">{{ $t('document.current-path', currentPath) }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { DocCategory, DocType } from '@fe/types'
import { useI18n } from '@fe/services/i18n'

const { $t } = useI18n()

const props = defineProps<{
  currentPath: string;
  categories: DocCategory[];
  docType?: DocType | null
}>()

const emits = defineEmits<{
  'updateDocType': [docType: DocType];
}>()

const xCategories = computed(() => props.categories.map(x => ({
  ...x,
  types: x.types.filter(x => !!x.buildNewContent)
})).filter(x => x.types.length))

</script>

<style lang="scss" scoped>
.create-file-panel {
  .category-list-wrapper {
    max-height: calc(100vh - 300px);
    overflow-y: auto
  }

  .category {
    padding-left: 8px;
    margin-bottom: 4px;

    .category-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .category-list {
      display: flex;
      flex-wrap: wrap;
      padding-left: 8px;
    }

    .category-item {
      cursor: pointer;
      display: flex;
      align-items: center;
      margin-right: 10px;
      margin-bottom: 10px;
      font-size: 14px;

      input {
        cursor: pointer;
        margin-right: 5px;
      }
    }
  }

  .current-path {
    margin-bottom: 8px;
    font-size: 13px;
  }
}
</style>
