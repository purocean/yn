<template>
  <index-status style="width: 300px" :title="title">
    <div class="header">
      <group-tabs :tabs="[
        { value: 'links', label: $t('view-links.links') },
        { value: 'back-links', label: $t('view-links.back-links') },
      ]" size="small" v-model="currentTab" />
    </div>
    <ol v-if="list && list.length" class="list">
      <li v-for="item in list" :key="item.title" class="item" :data-type="currentTab">
        <span v-if="item.location" class="item-icon-location" @click="switchDoc(item.location.doc, { source: 'view-links', position: item.location.position })">
          <SvgIcon name="location-crosshairs-solid" width="10px" height="10px" />
        </span>
        <a
          href="#"
          @click.prevent="switchDoc(item.doc, { source: 'view-links', position: item.position })">
          {{ item.title }}
        </a>
      </li>
    </ol>
    <div v-else class="tips">
      <span v-if="list">{{ $t('view-links.no-result') }}</span>
      <span v-else>Loading...</span>
    </div>
  </index-status>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { basename } from '@fe/utils/path'
import { useFixedFloat } from '@fe/support/ui/fixed-float'
import { getDocumentsManager } from '@fe/services/indexer'
import { switchDoc } from '@fe/services/document'
import { useI18n } from '@fe/services/i18n'
import store from '@fe/support/store'
import type { Doc, PositionState } from '@fe/types'
import SvgIcon from '@fe/components/SvgIcon.vue'
import GroupTabs from '@fe/components/GroupTabs.vue'
import IndexStatus from '@fe/components/IndexStatus.vue'

type TabItemValue = 'links' | 'back-links'
type ListItem = { title: string, doc: Doc, position?: PositionState | null, location?: { doc: Doc, position: { line: number } } }

const currentTab = ref<TabItemValue>('links')
const title = ref('')
const list = ref<(ListItem[] | null)>(null)
const { t: $t } = useI18n()

const currentFileRepo = store.state.currentFile?.repo
const currentFilePath = store.state.currentFile?.path
const currentFileName = store.state.currentFile?.name

const buildList = (type: TabItemValue) => {
  list.value = null
  title.value = currentFileName ? {
    links: $t('view-links.links-in', currentFileName),
    'back-links': $t('view-links.back-links-for', currentFileName),
  }[type] : ''

  if (!store.state.currentRepoIndexStatus?.status.ready || currentFileRepo !== store.state.currentRepoIndexStatus?.repo || !currentFilePath) {
    list.value = []
    return
  }

  const buildTitle = (name: string, position?: PositionState | null) => {
    name = name.replace(/^\/|\.md$/gi, '')

    if (!position) {
      return name
    }

    let pos = ''

    if ('anchor' in position) {
      pos = `#${position.anchor}`
    } else if ('line' in position) {
      pos = `:${position.line}`
    }

    return name + pos
  }

  const dm = getDocumentsManager()

  if (type === 'links') {
    dm.findByRepoAndPath(currentFileRepo, currentFilePath).then(doc => {
      if (currentTab.value === 'links') {
        list.value = doc ? doc.links.filter(link => !!link.internal).map(link => ({
          title: buildTitle(link.internal!, link.position),
          doc: { type: 'file' as const, repo: currentFileRepo, path: link.internal!, name: basename(link.internal!), },
          position: link.position,
          location: {
            doc: {
              type: 'file' as const,
              repo: currentFileRepo,
              path: currentFilePath,
              name: currentFileName!,
            },
            position: { line: link.blockMap[0] + 1 },
          }
        })) : []
      }
    })
  } else if (type === 'back-links') {
    const data: ListItem[] = []

    dm.getTable().where({ repo: currentFileRepo }).each(doc => {
      doc.links.forEach(link => {
        if (link.internal === currentFilePath) {
          const position: PositionState = { line: link.blockMap[0] + 1 }
          data.push({
            title: buildTitle(doc.path, position),
            doc: { type: 'file', repo: currentFileRepo, path: doc.path, name: basename(doc.path) },
            position
          })
        }
      })
    }).then(() => {
      if (currentTab.value === 'back-links') {
        list.value = data
      }
    })
  }
}

const close = () => {
  useFixedFloat().hide()
}

watch(() => currentTab.value, buildList)
watch(() => store.state.currentRepoIndexStatus?.status.ready, () => buildList(currentTab.value))
watch(() => [store.state.currentFile?.repo, store.state.currentRepo?.name], (val) => {
  if (val[0] !== currentFileRepo || val[1] !== currentFileRepo) {
    close()
  }
}, { flush: 'post' })

onMounted(() => {
  buildList(currentTab.value)
})
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  justify-content: center;
  border-bottom: 1px solid var(--g-color-85);
  padding: 5px 0;
}

.tips {
  text-align: center;
  font-style: italic;
  color: var(--g-color-45);
  padding: 20px 0 10px;
  font-size: 14px;
}

.list {
  max-height: 60vh;
  overflow-y: auto;
  margin: 0;
  padding: 8px 10px 8px 40px;
  background-color: rgba(var(--g-foreground-color-rgb), 0.025);
  overflow-wrap: break-word;

  .item {
    line-height: 1.2;
    margin: 4px 0;
    font-size: 14px;
    position: relative;

    &::marker {
      font-size: 12px;
    }

    .item-icon-location {
      display: none;
      box-sizing: border-box;
      color: var(--g-color-30);
      width: 16px;
      height: 16px;
      padding: 3px;
      position: absolute;
      left: -18px;
      top: 2px;

      &:hover {
        color: var(--g-color-0);
        background-color: var(--g-color-80);
        border-radius: 50%;
      }

      .svg-icon {
        display: block;
      }
    }

    &[data-type="links"]:hover {
      &::marker {
        color: transparent;
      }

      .item-icon-location {
        display: inline;
      }
    }
  }
}
</style>
