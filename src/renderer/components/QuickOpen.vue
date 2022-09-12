<template>
  <div
    class="filter"
    @keydown.tab.exact.stop="switchTab(1)"
    @keydown.shift.tab.exact.stop="switchTab(-1)"
    @keypress.enter.exact="chooseItem()"
    @keydown.up.exact="selectItem(-1)"
    @keydown.down.exact="selectItem(1)"
    @click.stop>
    <div class="tab">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        @click="switchTab(tab.key)"
        :class="{selected: currentTab === tab.key}">{{tab.label}}</div>
    </div>
    <input
      ref="refInput"
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
          :key="item.repo + item.path"
          :class="{selected: selected === item}"
          @click="chooseItem(item)">
          <span :ref="el => refFilename[i] = el">
            {{item.name}}
          </span>
          <span :ref="el => refFilepath[i] = el" class="path">
            [{{item.repo}}] {{item.path.substr(0, item.path.lastIndexOf('/'))}}
          </span>
        </li>
        <li v-if="dataList.length < 1">{{$t('quick-open.empty')}}</li>
      </template>
    </ul>
  </div>
</template>

<script lang="ts">
import { debounce } from 'lodash-es'
import { computed, defineComponent, nextTick, onMounted, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import * as api from '@fe/support/api'
import { useI18n } from '@fe/services/i18n'
import fuzzyMatch from '@fe/others/fuzzy-match'
import { fetchSettings } from '@fe/services/setting'
import { PathItem } from '@fe/types'

type TabKey = 'marked' | 'search' | 'file'

let lastTab: TabKey = 'marked'
let markedFilesCache: PathItem[] = []

export default defineComponent({
  name: 'quick-open',
  props: {
    withMarked: {
      type: Boolean,
      default: true,
    },
  },
  setup (props, { emit }) {
    const { t } = useI18n()
    const store = useStore()

    const refInput = ref<HTMLInputElement | null>(null)
    const refResult = ref<HTMLUListElement | null>(null)
    const refFilename = ref<HTMLElement[]>([])
    const refFilepath = ref<HTMLElement[]>([])
    const markedFiles = ref<PathItem[]>(markedFilesCache)

    const { currentRepo, recentOpenTime, tree } = toRefs(store.state)

    const selected = ref<any>(null)
    const searchText = ref('')
    const currentTab = ref<TabKey>(lastTab)
    const list = ref<any>([])
    const lastFetchTime = ref(0)

    const repo = computed(() => currentRepo.value?.name)

    const tabs = computed(() => {
      const arr: {key: TabKey; label: string}[] = [
        { key: 'file', label: t('quick-open.files') },
        { key: 'search', label: t('quick-open.search') },
      ]

      if (props.withMarked) {
        arr.unshift({ key: 'marked', label: t('quick-open.marked') })
      }

      return arr
    })

    const files = computed(() => {
      const travelFiles = (tree: any) => {
        let tmp: any[] = []

        tree.forEach((node: any) => {
          if (node.type === 'file' && node.path.endsWith('.md')) {
            tmp.push(node)
          }

          if (Array.isArray(node.children)) {
            tmp = tmp.concat(travelFiles(node.children))
          }
        })

        return tmp
      }

      return travelFiles(tree.value || [])
    })

    function sortList (list: any) {
      if (list === null) {
        return
      }

      const map = (recentOpenTime.value || {})

      return list.sort((a: any, b: any) => {
        const at = map[`${a.repo}|${a.path}`] || 0
        const bt = map[`${b.repo}|${b.path}`] || 0

        return bt - at
      })
    }

    function filterFiles (files: any[], search: string, fuzzy: boolean) {
      if (!fuzzy) {
        search = search.toLowerCase()
        return files.filter(x => x.path.toLowerCase().indexOf(search) > -1)
      }

      const tmp: any[] = []

      files.forEach(x => {
        const result = fuzzyMatch(search, x.path)

        if (result.matched) {
          tmp.push({ ...x })
        }
      })

      return tmp.sort((a, b) => b.score - a.score)
    }

    const dataList = computed(() => {
      if (!list.value) {
        return null
      }

      // filter except full text search.
      const arr = currentTab.value === 'search' ? list.value : filterFiles(list.value, searchText.value.trim(), false)

      // sort by last usage time.
      return sortList(arr).slice(0, 70)
    })

    const searchWithDebounce = debounce(async (text: string, call: Function) => {
      if (repo.value && text.trim()) {
        const fetchTime = new Date().getTime()
        lastFetchTime.value = fetchTime
        const data = await api.search(repo.value, text.trim())
        // ensure last result be ahead of list.
        if (fetchTime >= lastFetchTime.value) {
          call(data)
        }
      } else {
        call([])
      }
    }, 500)

    function highlightText (search: string) {
      if (refFilename.value && refFilepath.value) {
        search = search.toLowerCase()

        const openF = '(#$*B'
        const closeF = '#$*B)'

        const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

        const openR = new RegExp(escape(openF), 'g')
        const closeR = new RegExp(escape(closeF), 'g')

        ;(refFilename.value || []).concat(refFilepath.value || []).forEach(function (it: any) {
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
        list.value = markedFiles.value
      } else if (currentTab.value === 'search') {
        const keyword = searchText.value.trim()
        list.value = keyword ? null : []

        searchWithDebounce(keyword, (data: any[]) => {
          if (currentTab.value === 'search') {
            list.value = data
          }
        })
      }
    }

    function updateSelected (item: any = null) {
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

      const currentIndex = dataList.value.findIndex((x: any) => selected.value === x)

      let index = currentIndex + inc
      if (index > dataList.value.length - 1) {
        index = 0
      } else if (index < 0) {
        index = dataList.value.length - 1
      }

      updateSelected(dataList.value[index])
    }

    function chooseItem (item: any = null) {
      const file = item || selected.value
      if (file) {
        emit('choose-file', file)
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

    watch(() => props.withMarked, val => {
      if (!val && currentTab.value === 'marked') {
        currentTab.value = 'file'
      }
    }, { immediate: true })

    watch(searchText, () => updateDataSource())

    watch(dataList, () => {
      updateSelected()
      if (currentTab.value !== 'search') { // search model do not highlight text.
        nextTick(() => highlightText(searchText.value.trim()))
      }
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
      const settings = await fetchSettings()
      markedFilesCache = settings.mark || []
      markedFiles.value = markedFilesCache
      updateDataSource()
    })

    return {
      refInput,
      refResult,
      refFilename: refFilename as any,
      refFilepath: refFilepath as any,
      tabs,
      currentTab,
      searchText,
      dataList,
      selected,
      selectItem,
      chooseItem,
      switchTab,
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
  max-height: 300px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 6px 0;
}

.result li {
  color: var(--g-color-40);
  line-height: 1.5em;
  font-size: 18px;
  padding: 2px;
  transition: all .1s ease-in-out;
  cursor: pointer;
  border-radius: var(--g-border-radius);
}

.result li.selected,
.result li:hover {
  padding: 2px 6px;
  background: var(--g-color-active-a);
  color: var(--g-color-10);
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
  color: var(--g-color-5);
  font-weight: bold;
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
  background: var(--g-color-active-c);;
  cursor: pointer;
  transition: all .1s ease-in-out;
  color: var(--g-color-10);
  border-right: 1px var(--g-color-80) solid;
}

.tab > div:last-child {
  border-right: 0;
}

.tab > div:hover {
  background: var(--g-color-active-b);
}

.tab > div.selected {
  background: var(--g-color-active-a);
}

.input {
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}
</style>
