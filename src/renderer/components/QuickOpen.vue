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
          :key="item.key"
          :class="{
            selected: isEqual(item, selected),
            marked: item.marked
          }"
          @mouseover="!disableMouseover && updateSelected(item)"
          @click="chooseItem(item)">
          <span :ref="(el: any) => refTitles[i] = el">
            {{item.title}}
          </span>
          <span class="description">
            <span v-if="item.tip">{{item.tip}}</span>
            <span :ref="(el: any) => refDescriptions[i] = el">
              {{item.description}}
              <!-- {{(item as any)._score}} -->
            </span>
          </span>
        </li>
        <li v-if="dataList.length < 1">{{$t('quick-open.empty')}}</li>
      </template>
    </ul>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, ref, shallowRef, toRefs, watch } from 'vue'
import { useI18n } from '@fe/services/i18n'
import { fuzzyMatch } from '@fe/others/fuzzy-match'
import { fetchSettings } from '@fe/services/setting'
import { getMarkedFiles, isMarked, supported } from '@fe/services/document'
import store from '@fe/support/store'
import type { BaseDoc, Components } from '@fe/types'

type TabKey = Components.QuickOpen.TabKey
type DataItem = Components.QuickOpen.DataItem

let lastTab: TabKey = 'marked'
let markedFilesCache: BaseDoc[] = []

const RESULT_LIMIT = 70

export default defineComponent({
  name: 'quick-open',
  props: {
    filterItem: {
      type: Function as unknown as () => (item : DataItem) => boolean,
      default: () => () => true,
    },
  },
  setup (props, { emit }) {
    const { t } = useI18n()

    const refInput = ref<HTMLInputElement | null>(null)
    const refResult = ref<HTMLUListElement | null>(null)
    const refTitles = ref<(HTMLElement | null)[]>([])
    const refDescriptions = ref<(HTMLElement | null)[]>([])
    const markedFiles = ref<BaseDoc[]>(markedFilesCache)

    const { recentOpenTime, tree } = toRefs(store.state)

    const selected = ref<DataItem | null>(null)
    const searchText = ref('')
    const currentTab = ref<TabKey>(lastTab)
    const list = shallowRef<DataItem[] | null>([])
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

    function sortList (list: DataItem[]) {
      const isFile = list[0]?.type === 'file'
      if (!isFile) {
        return list
      }

      const map = (recentOpenTime.value || {})

      return list.sort((a, b) => {
        const at = map[`${(a.payload as BaseDoc).repo}|${(a.payload as BaseDoc).path}`] || 0
        const bt = map[`${(b.payload as BaseDoc).repo}|${(b.payload as BaseDoc).path}`] || 0

        return bt - at
      })
    }

    function filterFiles (files: DataItem[], search: string, fuzzy: boolean) {
      if (!fuzzy) {
        search = search.toLowerCase()
        return files.filter(x => x.title.toLowerCase().indexOf(search) > -1 || x.description.toLowerCase().indexOf(search) > -1)
      }

      type Item = (DataItem & { _score: number })
      const tmp: Item[] = []

      files.forEach(x => {
        const nameResult = fuzzyMatch(search, x.title)
        const descResult = fuzzyMatch(search, x.description)
        if (nameResult.matched || descResult.matched) {
          ;(x as Item)._score = nameResult.score * 100000 + descResult.score
          tmp.push(x as Item)
        }
      })

      return tmp.sort((a, b) => b._score - a._score)
    }

    const dataList = computed<DataItem[] | null>(() => {
      if (!list.value) {
        return null
      }

      const data = list.value

      const search = searchText.value.trim()

      const result = search ? filterFiles(data, search, true) : sortList(data)

      const filteredResult = []

      for (const item of result) {
        if (filteredResult.length >= RESULT_LIMIT) break
        if (props.filterItem(item)) {
          // mark if the file is marked
          if (item.type === 'file') {
            item.marked = isMarked(item.payload)
          }

          filteredResult.push(item)
        }
      }

      return filteredResult
    })

    function isEqual (a: DataItem | null, b: DataItem | null) {
      return a?.key === b?.key
    }

    function highlightText (search: string) {
      if (refTitles.value && refDescriptions.value) {
        search = search.toLowerCase()

        const openF = '(#$*B'
        const closeF = '#$*B)'

        const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

        const openR = new RegExp(escape(openF), 'g')
        const closeR = new RegExp(escape(closeF), 'g')

        ;(refTitles.value || []).concat(refDescriptions.value || []).forEach((it) => {
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

    function getDescriptionFromDoc (doc: BaseDoc) {
      return doc.path.slice(0, doc.path.lastIndexOf('/'))
    }

    function updateDataSource () {
      if (currentTab.value === 'file') {
        list.value = files.value.map(item => {
          return {
            key: `${item.repo}|${item.path}`,
            type: 'file',
            payload: item,
            title: item.name || item.path,
            description: getDescriptionFromDoc(item),
            marked: false,
          } satisfies DataItem
        })
      } else if (currentTab.value === 'marked') {
        list.value = markedFiles.value.map(item => {
          return {
            key: `${item.repo}|${item.path}`,
            type: 'file',
            tip: item.repo,
            payload: item,
            title: item.name || item.path,
            description: getDescriptionFromDoc(item),
            marked: true,
          } satisfies DataItem
        })
      }
    }

    function updateSelected (item: DataItem | null = null) {
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

    function chooseItem (item: DataItem | null = null) {
      const dataItem = item || selected.value
      if (dataItem) {
        emit('choose-item', { ...dataItem } satisfies DataItem)
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

    function updateSearchText (text: string) {
      searchText.value = text
    }

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
      refTitles,
      refDescriptions,
      tabs,
      currentTab,
      searchText,
      dataList,
      selected,
      selectItem,
      chooseItem,
      switchTab,
      updateSearchText,
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

.result li span.description {
  font-size: 12px;
  color: #888;
  padding-left: .3em;
}

.result li span.description ::v-deep(b) {
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
