<template>
  <div v-if="currentRepo && currentFile" class="indexer-status" @click.prevent="handleCommand">
    <p v-if="currentRepo.name !== currentFile.repo" v-html="$t('index-status.switch-repository-html', currentFile.repo)" />
    <p v-else-if="!currentRepo.enableIndexing" v-html="$t('index-status.enable-indexing-html', currentRepo.name)" />
    <template v-else-if="!currentRepoIndexStatus?.ready">
      <p v-if="!currentRepoIndexStatus">
        [<strong>{{ currentRepo.name }}</strong>] {{ $t('index-status.indexing') }}
      </p>
      <template v-else>
        <p>[<strong>{{ currentRepo.name }}</strong>] {{ $t('index-status.indexing') }} ({{ currentRepoIndexStatus.indexed }}) ({{ currentRepoIndexStatus.cost }}ms)</p>
        <p class="processing">{{ currentRepoIndexStatus.processing }}</p>
      </template>
    </template>
    <template v-else>
      <slot>
        <p>
          {{ $t('index-status.indexed') }} {{ currentRepoIndexStatus.indexed }} ({{ currentRepoIndexStatus.cost }}ms)
        </p>
      </slot>
      <div v-if="title" class="footer">
        {{ title }} &nbsp;
        <a class="re-index-btn" href="#" @click.prevent="rebuildCurrentRepo()" :title="`Indexed: ${store.state.currentRepoIndexStatus?.status?.indexed}, Total: ${store.state.currentRepoIndexStatus?.status?.total}, Cost: ${store.state.currentRepoIndexStatus?.status?.cost}ms`">
          {{ $t('view-links.re-index') }}
        </a>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import store from '@fe/support/store'
import { setCurrentRepo, toggleRepoIndexing } from '@fe/services/repo'
import { rebuildCurrentRepo } from '@fe/services/indexer'
import { useI18n } from '@fe/services/i18n'

defineProps<{
  title?: string
}>()

const currentRepo = computed(() => store.state.currentRepo)
const currentFile = computed(() => store.state.currentFile)
const currentRepoIndexStatus = computed(() => store.state.currentRepoIndexStatus?.status)
const { $t } = useI18n()

function handleCommand (e: MouseEvent) {
  if (!currentRepo.value || !currentFile.value) {
    return
  }

  const target = e.target as HTMLElement
  const command = target.dataset.command || target.parentElement?.dataset.command
  if (command === 'switch-repository') {
    e.preventDefault()
    setCurrentRepo(currentFile.value.repo)
  } else if (command === 'enable-indexing') {
    e.preventDefault()
    toggleRepoIndexing(currentRepo.value.name, true)
  }
}
</script>

<style lang="scss" scoped>
.indexer-status {
  position: relative;

  & > p {
    margin-top: 6px;
    margin-bottom: 6px;
    padding: 0 10px;
    overflow-wrap: break-word;
    font-size: 14px;

    &.processing {
      font-size: 12px;
      color: var(--g-color-30);
    }
  }
}

.footer {
  text-align: center;
  color: var(--g-color-30);
  padding: 10px;
  font-size: 13px;
  border-top: 1px solid var(--g-color-85);
  overflow-wrap: break-word;

  .re-index-btn {
    display: none;
    white-space: nowrap;
  }

  &:hover .re-index-btn {
    display: inline;
    color: var(--g-color-30);
  }
}
</style>
