<template>
  <div v-if="currentRepo" class="indexer-status" @click.prevent="handleCommand">
    <p v-if="status === 'not-same-repo'" v-html="$t('index-status.switch-repository-html', currentFile!.repo)" />
    <p v-else-if="status === 'index-disabled'" v-html="$t('index-status.enable-indexing-html', currentRepo.name)" />
    <template v-else-if="status === 'indexing'">
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
          {{ $t('index-status.indexed') }} {{ currentRepoIndexStatus?.indexed }} ({{ currentRepoIndexStatus?.cost }}ms)
        </p>
      </slot>
      <div v-if="title" class="footer">
        {{ title }} &nbsp;

        <span class="index-action">
          <a href="#" @click.prevent="rebuildCurrentRepo()" :title="`Indexed: ${store.state.currentRepoIndexStatus?.status?.indexed}, Total: ${store.state.currentRepoIndexStatus?.status?.total}, Cost: ${store.state.currentRepoIndexStatus?.status?.cost}ms`">
            {{ $t('view-links.re-index') }}
          </a>
          /
          <a href="#" @click.prevent="disableIndex()">{{ $t('view-links.disable-index') }}</a>
        </span>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue'
import store from '@fe/support/store'
import { setCurrentRepo, toggleRepoIndexing } from '@fe/services/repo'
import { rebuildCurrentRepo } from '@fe/services/indexer'
import { useI18n } from '@fe/services/i18n'
import type { Components } from '@fe/types'

const props = defineProps<{
  title?: string;
  disableCheckCurrentFile?: boolean;
}>()

type Status = Components.IndexStatus.Status

const emit = defineEmits<{
  'status-change': [Status]
}>()

const currentRepo = computed(() => store.state.currentRepo)
const currentFile = computed(() => store.state.currentFile)
const currentRepoIndexStatus = computed(() => store.state.currentRepoIndexStatus?.status)
const { $t } = useI18n()

const status = computed<Status>(() => {
  if (!currentRepo.value) {
    return 'not-open-repo'
  }

  if (!currentFile.value && !props.disableCheckCurrentFile) {
    return 'not-open-file'
  }

  if (!props.disableCheckCurrentFile && currentRepo.value.name !== currentFile.value?.repo) {
    return 'not-same-repo'
  }

  if (!currentRepo.value.enableIndexing) {
    return 'index-disabled'
  }

  if (!currentRepoIndexStatus.value?.ready) {
    return 'indexing'
  }

  return 'indexed'
})

watch(status, (value) => {
  emit('status-change', value)
}, { immediate: true })

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

function disableIndex () {
  if (currentRepo.value) {
    toggleRepoIndexing(currentRepo.value.name, false)
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

  .index-action {
    display: none;
    white-space: nowrap;
    color: var(--g-color-30);

    a {
      color: var(--g-color-30);
    }
  }

  &:hover .index-action {
    display: inline;
  }
}
</style>
