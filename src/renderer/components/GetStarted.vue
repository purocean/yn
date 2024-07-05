<template>
  <div class="get-started-wrapper">
    <div class="get-started">
      <div class="head">
        <h1 class="caption">{{$t('app-name')}}</h1>
        <div class="desc">{{$t('slogan')}}</div>
      </div>
      <div class="section">
        <div v-if="!FLAG_READONLY" class="start">
          <h2>{{$t('get-started.start')}}</h2>
          <div class="list">
            <div class="item" v-if="!hasRepo">
              <a href="javascript:void(0);" @click="showSettingPanel()">{{$t('tree.add-repo')}}...</a>
            </div>
            <template v-else>
              <div class="item">
                <a href="javascript:void(0);" @click="createFile()">{{$t('tree.context-menu.create-doc')}}...</a>
              </div>
              <div class="item" v-if="!getPurchased()">
                <a href="javascript:void(0);" @click="showPremium()">{{$t('premium.premium')}}...</a>
              </div>
              <div class="item">
                <a href="javascript:void(0);" @click="showExtensionManager()">{{$t('status-bar.extension.extension-manager')}}...</a>
              </div>
              <div class="item">
                <a href="javascript:void(0);" @click="showSettingPanel()">{{$t('status-bar.setting')}}...</a>
              </div>
            </template>
          </div>
        </div>
        <div class="help">
          <h2>{{$t('get-started.help')}}</h2>
          <div class="list">
            <div class="item">
              <a href="javascript:void(0);" @click="openHelpDoc('readme')">{{$t('status-bar.help.readme')}}</a>
            </div>
            <div class="item">
              <a href="javascript:void(0);" @click="openHelpDoc('features')">{{$t('status-bar.help.features')}}</a>
            </div>
            <div class="item">
              <a href="javascript:void(0);" @click="openHelpDoc('plugin')">{{$t('status-bar.help.plugin')}}</a>
            </div>
            <div class="item">
              <a href="javascript:void(0);" @click="openShortcutManager()">{{$t('status-bar.help.shortcuts')}}</a>
            </div>
            <div class="item">
              <a href="javascript:void(0);" @click="openFeedback()">{{$t('feedback')}}</a>
            </div>
          </div>
        </div>
        <div class="recent" v-if="recentFiles.length">
          <h2>{{$t('get-started.recent')}}</h2>
          <div class="list">
            <div class="item" v-for="item in recentFiles" :key="item.node.path">
              <a href="javascript:void(0);" @click="switchDoc(item.node)" :title="item.node.path">{{item.node.name}}</a>
              <span class="time">
                {{dayjs(item.time).fromNow()}}
              </span>
            </div>
            <div class="item">
              <a href="javascript:void(0);" @click="getActionHandler('workbench.show-quick-open')()">{{$t('more')}}…</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import { computed } from 'vue'
import { FLAG_READONLY, URL_GITHUB } from '@fe/support/args'
import { useI18n } from '@fe/services/i18n'
import store from '@fe/support/store'
import { showManager as showExtensionManager } from '@fe/others/extension'
import { showPremium, getPurchased } from '@fe/others/premium'
import { showSettingPanel } from '@fe/services/setting'
import { createDoc, supported, switchDoc } from '@fe/services/document'
import { getActionHandler } from '@fe/core/action'

useI18n()

const hasRepo = computed(() => !!store.state.currentRepo)

const files = computed(() => {
  const map = (store.state.recentOpenTime || {})
  const travelFiles = (tree: any) => {
    let tmp: any[] = []

    tree.forEach((node: any) => {
      if (supported(node)) {
        const time = map[`${node.repo}|${node.path}`]
        if (time) {
          tmp.push({ node, time })
        }
      }

      if (Array.isArray(node.children)) {
        tmp = tmp.concat(travelFiles(node.children))
      }
    })

    return tmp
  }

  return travelFiles(store.state.tree || [])
})

const recentFiles = computed(() => {
  const list = files.value
  return list.sort((a: any, b: any) => b.time - a.time).slice(0, 5)
})

async function createFile () {
  const currentRepo = store.state.currentRepo
  if (currentRepo) {
    await createDoc({ repo: currentRepo.name }, { type: 'dir', name: 'root', path: '/', repo: currentRepo.name })
  }
}

function openHelpDoc (name: string) {
  getActionHandler(`plugin.status-bar-help.show-${name}`)()
}

function openFeedback () {
  window.open(URL_GITHUB)
}

function openShortcutManager () {
  getActionHandler('keyboard-shortcuts.show-manager')()
}
</script>

<style lang="scss" scoped>
.get-started-wrapper {
  width: 100%;
  height: 100%;
  overflow-x : hidden;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  background: var(--g-color-100);
  padding-top: 8vh;
}

.get-started {
  width: 80%;
  height: 480px;

  .head {
    .caption {
      margin-bottom: 10px;
      font-size: 36px;
      font-weight: 400;
    }

    .desc {
      font-size: 16px;
      margin-left: 4px;
      color: var(--g-color-40);
    }
  }

  .section {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 2fr 3fr;
    grid-template-areas: "start help"
                         "recent .";
    height: 100%;

    h2 {
      font-weight: 200;
      margin-bottom: 10px;
      color: var(--g-color-20);
      font-size: 28px;
    }

    .list {
      margin-top: 10px;
      margin-left: 4px;
      max-width: 50vw;

      .item {
        margin-top: 8px;
        font-size: 15px;

        a {
          text-decoration: none;
          text-overflow: ellipsis;
          word-wrap: break-word;
        }

        .time {
          color: var(--g-color-30);
          margin-left: 10px;
        }
      }
    }

    .recent {
      grid-column: 1 / span 2;
      grid-row: 2;
    }
  }
}

@media screen and (max-height: 730px) {
  .get-started-wrapper {
    padding-top: 0;
  }

  .get-started {
    .head {
      display: none;
    }
  }
}
</style>
