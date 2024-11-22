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
    <slot v-else>
      <p>
        {{ $t('index-status.indexed') }} {{ currentRepoIndexStatus.indexed }} ({{ currentRepoIndexStatus.cost }}ms)
      </p>
    </slot>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import store from '@fe/support/store'
import { setCurrentRepo, toggleRepoIndexing } from '@fe/services/repo'
import { useI18n } from '@fe/services/i18n'

const currentRepo = computed(() => store.state.currentRepo)
const currentFile = computed(() => store.state.currentFile)
const currentRepoIndexStatus = computed(() => store.state.currentRepoIndexStatus?.status)
const { $t } = useI18n()

function handleCommand (e: MouseEvent) {
  if (!currentRepo.value || !currentFile.value) {
    return
  }

  const command = (e.target as HTMLElement).dataset.command
  if (command === 'switch-repository') {
    setCurrentRepo(currentFile.value.repo)
    e.preventDefault()
  } else if (command === 'enable-indexing') {
    toggleRepoIndexing(currentRepo.value.name, true)
    e.preventDefault()
  }
}
</script>

<style lang="scss" scoped>
.indexer-status {
  width: 300px;
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
</style>
