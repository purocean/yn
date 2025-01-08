<template>
  <div
    class="filter"
    @keydown.tab.exact.stop="switchTab(1)"
    @keydown.shift.tab.exact.stop="switchTab(-1)"
    @keypress.enter.exact="chooseItem()"
    @keydown.up.exact="selectItem(-1)"
    @keydown.down.exact="selectItem(1)"
    @click.stop>
    <div class="tab" v-if="tabs.length > 1">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        @click="switchTab(tab.key)"
        :class="{selected: currentTab === tab.key}">{{tab.label}}</div>
    </div>
    <input
      ref="refInput"
      v-auto-focus="{ delay: 0 }"
      v-model="searchText"
      type="text"
      class="input"
      :placeholder="$t('quick-open.input-placeholder')"
      @keydown.tab.prevent
      @keydown.up.prevent
      @keydown.down.prevent>
    <ul ref="refResult" class="result">
      <li v-if="dataList === null">{{$t('loading')}}</li>
      <template v-else>
        <li
          v-for="(item, i) in dataList"
          :key="item.type + item.repo + item.path"
          :class="{
            selected: isEqual(item, selected),
            marked: isMarked(item)
          }"
          @mouseover="!disableMouseover && updateSelected(item)"
          @click="chooseItem(item)">
          <span :ref="(el: any) => refFilename[i] = el">
            {{item.name}}
          </span>
          <span class="path">
            <span v-if="currentTab === 'marked'">[{{item.repo}}]</span> <span :ref="(el: any) => refFilepath[i] = el">{{item.path.slice(0, item.path.lastIndexOf('/'))}}</span>
          </span>
        </li>
        <li v-if="dataList.length < 1">{{$t('quick-open.empty')}}</li>
      </template>
    </ul>
  </div>
</template>

<script lang="ts">
import { cloneDeep } from 'lodash-es'
import { computed, defineComponent, nextTick, onMounted, ref, shallowRef, toRefs, watch } from 'vue'
import { useI18n } from '@fe/services/i18n'
import fuzzyMatch from '@fe/others/fuzzy-match'
import { fetchSettings } from '@fe/services/setting'
import { getMarkedFiles, isMarked, supported } from '@fe/services/document'
import store from '@fe/support/store'
import type { BaseDoc, Components } from '@fe/types'

type TabKey = 'marked' | 'file' | 'command'

let lastTab: TabKey = 'marked'
let markedFilesCache: BaseDoc[] = []

export default defineComponent({
  name: 'quick-open',
  props: {
    onlyCurrentRepo: {
      type: Boolean,
      default: true,
    },
    filterItem: {
      type: Function as unknown as () => (item : BaseDoc) => boolean,
      default: () => () => true,
    },
  },
  setup (props, { emit }) {
    const { t } = useI18n()

    const refInput = ref<HTMLInputElement | null>(null)
    const refResult = ref<HTMLUListElement | null>(null)
    const refFilename = ref<HTMLElement[]>([])
    const refFilepath = ref<HTMLElement[]>([])
    const markedFiles = ref<BaseDoc[]>(markedFilesCache)

    const { recentOpenTime, tree } = toRefs(store.state)

    const selected = ref<BaseDoc | null>(null)
    const searchText = ref('')
    const currentTab = ref<TabKey>(lastTab)
    const list = shallowRef<BaseDoc[] | null>([])
    const disableMouseover = ref(false)

    const tabs = computed(() => {
      const arr: {key: TabKey; label: string}[] = [
        { key: 'marked', label: t('quick-open.marked') },
        { key: 'file', label: t('quick-open.files') },
      ]

      return arr
    })

    const files = computed(() => {
      const travelFiles = (tree: Components.Tree.Node[]) => {
        let tmp: BaseDoc[] = []

        tree.forEach((node) => {
          if (supported(node)) {
            tmp.push({
              name: node.name,
              path: node.path,
              repo: node.repo,
              type: node.type
            })
          }

          if (Array.isArray(node.children)) {
            tmp = tmp.concat(travelFiles(node.children))
          }
        })

        return tmp
      }

      return travelFiles(tree.value || [])
    })

    function sortList (list: BaseDoc[]) {
      const map = (recentOpenTime.value || {})

      return list.sort((a, b) => {
        const at = map[`${a.repo}|${a.path}`] || 0
        const bt = map[`${b.repo}|${b.path}`] || 0

        return bt - at
      })
    }

    function filterFiles (files: BaseDoc[], search: string, fuzzy: boolean) {
      if (!fuzzy) {
        search = search.toLowerCase()
        return files.filter(x => x.path.toLowerCase().indexOf(search) > -1)
      }

      type Item = (BaseDoc & { _score: number })
      const tmp: Item[] = []

      files.forEach(x => {
        const result = fuzzyMatch(search, x.path)
        if (result.matched) {
          const nameResult = fuzzyMatch(search, x.name)
          ;(x as Item)._score = nameResult.matched ? nameResult.score * 100000 + result.score : result.score
          tmp.push(x as Item)
        }
      })

      return tmp.sort((a, b) => b._score - a._score)
    }

    const dataList = computed(() => {
      if (!list.value) {
        return null
      }

      const data = list.value

      const currentRepoName = store.state.currentRepo?.name
      const search = searchText.value.trim()

      const result = search ? filterFiles(data, search, true) : sortList(data)

      const limit = 70
      const filteredResult = []

      for (const item of result) {
        if (filteredResult.length >= limit) break
        if (props.filterItem(item) && (props.onlyCurrentRepo ? item.repo === currentRepoName : true)) {
          filteredResult.push(item)
        }
      }

      return filteredResult
    })

    function isEqual (a: BaseDoc | null, b: BaseDoc | null) {
      return a?.type === b?.type && a?.repo === b?.repo && a?.path === b?.path
    }

    function highlightText (search: string) {
      if (refFilename.value && refFilepath.value) {
        search = search.toLowerCase()

        const openF = '(#$*B'
        const closeF = '#$*B)'

        const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

        const openR = new RegExp(escape(openF), 'g')
        const closeR = new RegExp(escape(closeF), 'g')

        ;(refFilename.value || []).concat(refFilepath.value || []).forEach((it) => {
          if (!it) {
            return
          }

          let text = ''

          it.innerText.split('').forEach((char: string) => {
            if (search.indexOf(char.toLowerCase()) > -1) {
              text += `${openF}${char}${closeF}`
            } else {
              text += char
            }
          })

          it.innerText = text

          it.innerHTML = it.innerHTML.replace(openR, '<b>').replace(closeR, '</b>')
        })
      }
    }

    function updateDataSource () {
      if (currentTab.value === 'file') {
        list.value = files.value
      } else if (currentTab.value === 'marked') {
        list.value = cloneDeep(markedFiles.value)
      }
    }

    function updateSelected (item: BaseDoc | null = null) {
      if (dataList.value === null) {
        return
      }

      if (item) {
        selected.value = item
      } else {
        selected.value = dataList.value.length > 0 ? dataList.value[0] : null
      }

      nextTick(() => {
        if (refResult.value) {
          const li = refResult.value.querySelector<any>('li.selected')
          if (li) {
            li.scrollIntoViewIfNeeded()
          }
        }
      })
    }

    function selectItem (inc: number) {
      if (!dataList.value || dataList.value.length < 1) {
        updateSelected()
        return
      }

      const currentIndex = dataList.value.findIndex((x) => isEqual(x, selected.value))

      let index = currentIndex + inc
      if (index > dataList.value.length - 1) {
        index = 0
      } else if (index < 0) {
        index = dataList.value.length - 1
      }

      updateSelected(dataList.value[index])
    }

    function chooseItem (item: BaseDoc | null = null) {
      const file = item || selected.value
      if (file) {
        emit('choose-file', { ...file } satisfies BaseDoc)
      }
    }

    function switchTab (tab: TabKey| number) {
      if (typeof tab === 'string') {
        currentTab.value = tab
        return
      }

      const arr = tabs.value.map(x => x.key)

      const index = arr.indexOf(currentTab.value) + tab
      currentTab.value = arr[index > -1 ? index : arr.length - 1] || arr[0]
    }

    watch(searchText, () => updateDataSource())

    watch(dataList, val => {
      if (val?.length) {
        disableMouseover.value = true
        setTimeout(() => {
          disableMouseover.value = false
        }, 0)
      }

      updateSelected()

      nextTick(() => highlightText(searchText.value.trim()))
    })

    watch(currentTab, (val) => {
      lastTab = val
      list.value = null
      refInput.value!.focus()
      updateDataSource()
    })

    onMounted(async () => {
      refInput.value!.focus()
      updateDataSource()
      await fetchSettings()
      markedFilesCache = getMarkedFiles()
      markedFiles.value = markedFilesCache
      updateDataSource()
    })

    return {
      refInput,
      refResult,
      refFilename,
      refFilepath,
      tabs,
      currentTab,
      searchText,
      dataList,
      selected,
      selectItem,
      chooseItem,
      switchTab,
      updateSelected,
      disableMouseover,
      isMarked,
      isEqual,
    }
  },
})
</script>

<style scoped>
.filter {
  width: 600px;
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  margin: auto;
  padding: 10px;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
}

.result {
  max-height: min(calc(100vh - 260px), 300px);
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 6px 0;
}

.result li {
  color: var(--g-color-30);
  line-height: 1.5em;
  font-size: 18px;
  padding: 2px 6px;
  user-select: none;
  border-radius: var(--g-border-radius);
  font-variant-numeric: tabular-nums;
}

.result li.selected {
  background: var(--g-color-active-a);
  color: var(--g-color-2);
}

.result li.marked::after {
  content: '★';
  margin-left: 4px;
  font-size: 12px;
  vertical-align: text-top;
}

.result li span {
  vertical-align: middle
}

.result li span.path {
  font-size: 12px;
  color: #888;
  padding-left: .3em;
}

.result li span.path ::v-deep(b) {
  font-weight: 500;
}

.result li ::v-deep(b) {
  color: var(--g-color-0);
  font-weight: normal;
}

.tab {
  display: flex;
  margin-top: -8px;
  border-radius: var(--g-border-radius);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  overflow: hidden;
}

.tab > div {
  flex: auto;
  text-align: center;
  line-height: 1.5em;
  font-size: 12px;
  padding: 4px 0;
  background: var(--g-color-active-d);;
  cursor: pointer;
  transition: all .1s ease-in-out;
  color: var(--g-color-0);
  border-right: 1px var(--g-color-80) solid;
}

.tab > div:last-child {
  border-right: 0;
}

.tab > div:hover {
  background: var(--g-color-active-c);
}

.tab > div.selected {
  background: var(--g-color-active-b);
  font-weight: bold;
  color: var(--g-color-0);
}

.input {
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}
</style>
