<template>
  <div @keydown.tab.exact.stop="switchTab(1)" @keydown.shift.tab.exact.stop="switchTab(-1)" @keydown.enter.exact="chooseItem()" @keydown.up.exact="selectItem(-1)" @keydown.down.exact="selectItem(1)" class="filter" @click.stop>
    <div class="tab">
      <div v-for="tab in tabs" :key="tab.key" @click="switchTab(tab.key)" :class="{selected: currentTab === tab.key}">{{tab.label}}</div>
    </div>
    <input ref="input" v-model="searchText" type="text" class="input" @keydown.tab.prevent @keydown.up.prevent @keydown.down.prevent autofocus>
    <ul ref="result" class="result">
      <li v-if="dataList === null">加载中……</li>
      <template v-else>
        <li
          v-for="item in dataList"
          :key="item.repo + item.path"
          :class="{selected: selected === item}"
          @click="chooseItem(item)">
          <span ref="fileName">
            {{item.name}}
          </span>
          <span ref="filePath" class="path">
            [{{item.repo}}] {{item.path.substr(0, item.path.lastIndexOf('/'))}}
          </span>
        </li>
        <li v-if="dataList.length < 1">无结果</li>
      </template>
    </ul>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import file from '@/lib/file'
import fuzzyMatch from '@/lib/fuzzyMatch'

export default {
  name: 'quick-open',
  components: {},
  data () {
    return {
      selected: null,
      searchText: '',
      currentTab: 'marked',
      list: [],
      lastFetchTime: 0,
      tabs: [
        { key: 'marked', label: '已标记' },
        { key: 'file', label: '快速跳转' },
        { key: 'search', label: '搜索内容' },
      ]
    }
  },
  created () {
    this.searchWithDebounce = _.debounce(async (text, call) => {
      if (this.repo && text.trim()) {
        const fetchTime = new Date().getTime()
        this.lastFetchTime = fetchTime
        const data = await file.search(this.repo, text.trim())
        // 总是保证最后的搜索结果出现在列表
        if (fetchTime >= this.lastFetchTime) {
          call(data)
        }
      } else {
        call([])
      }
    }, 500)
  },
  async mounted () {
    this.$refs.input.focus()
    this.updateDataSource()
    await this.$store.dispatch('app/fetchMarkedFiles')
    this.updateDataSource()
  },
  methods: {
    travelFiles (tree) {
      let tmp = []

      tree.forEach(node => {
        if (node.type === 'file' && node.path.endsWith('.md')) {
          tmp.push(node)
        }

        if (Array.isArray(node.children)) {
          tmp = tmp.concat(this.travelFiles(node.children))
        }
      })

      return tmp
    },
    highlightText (search) {
      if (this.$refs.fileName && this.$refs.filePath) {
        search = search.toLowerCase()

        const openF = '(#$*B'
        const closeF = '#$*B)'

        const escape = function (s) {
          return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        }

        const openR = new RegExp(escape(openF), 'g')
        const closeR = new RegExp(escape(closeF), 'g')

        this.$refs.fileName.concat(this.$refs.filePath).forEach(function (it) {
          let text = ''

          it.innerText.toLowerCase().split('').forEach(char => {
            if (search.indexOf(char) > -1) {
              text += `${openF}${char}${closeF}`
            } else {
              text += char
            }
          })

          it.innerText = text

          it.innerHTML = it.innerHTML.replace(openR, '<b>').replace(closeR, '</b>')
        })
      }
    },
    filterFiles (files, search, fuzzy) {
      if (!fuzzy) {
        search = search.toLowerCase()
        return files.filter(x => x.path.toLowerCase().indexOf(search) > -1)
      }

      const tmp = []

      files.forEach(x => {
        const result = fuzzyMatch(search, x.path)

        if (result.matched) {
          tmp.push({ ...x })
        }
      })

      return tmp.sort((a, b) => b.score - a.score)
    },
    updateDataSource () {
      if (this.currentTab === 'file') {
        this.list = this.files
      } else if (this.currentTab === 'marked') {
        this.list = this.markedFiles
      } else if (this.currentTab === 'search') {
        this.list = null
        this.searchWithDebounce(this.searchText.trim(), data => {
          if (this.currentTab === 'search') {
            this.list = data
          }
        })
      }
    },
    updateSelected (item = null) {
      if (this.dataList === null) {
        return
      }

      if (item) {
        this.selected = item
      } else {
        this.selected = this.dataList.length > 0 ? this.dataList[0] : null
      }

      this.$nextTick(() => {
        const li = this.$refs.result.querySelector('li.selected')
        if (li) {
          li.scrollIntoViewIfNeeded()
        }
      })
    },
    selectItem (inc) {
      if (!this.dataList || this.dataList.length < 1) {
        this.updateSelected()
        return
      }

      const currentIndex = this.dataList.findIndex(x => this.selected === x)

      let index = currentIndex + inc
      if (index > this.dataList.length - 1) {
        index = 0
      } else if (index < 0) {
        index = this.dataList.length - 1
      }

      this.updateSelected(this.dataList[index])
    },
    chooseItem (item = null) {
      const file = item || this.selected
      if (file) {
        this.$emit('choose-file', file)
      }
    },
    switchTab (tab) {
      if (typeof tab === 'string') {
        this.currentTab = tab
        return
      }

      const tabs = this.tabs.map(x => x.key)

      const index = tabs.indexOf(this.currentTab) + tab
      this.currentTab = tabs[index > -1 ? index : tabs.length - 1] || tabs[0]
    },
    sortList (list) {
      if (list === null) {
        return
      }

      const map = (this.recentOpenTime || {})

      return list.sort((a, b) => {
        const at = map[`${a.repo}|${a.path}`] || 0
        const bt = map[`${a.repo}|${b.path}`] || 0

        return bt - at
      })
    }
  },
  watch: {
    list () {
      this.updateSelected()
    },
    searchText () {
      this.updateDataSource()
    },
    dataList () {
      this.$nextTick(() => this.highlightText(this.searchText.trim()))
    },
    currentTab () {
      this.list = null
      this.$refs.input.focus()
      this.updateDataSource()
    }
  },
  computed: {
    ...mapState('app', ['currentRepo', 'recentOpenTime', 'tree', 'markedFiles']),
    files () {
      return this.travelFiles(this.tree || [])
    },
    repo () {
      return this.currentRepo && this.currentRepo.name
    },
    dataList () {
      if (!this.list) {
        return null
      }

      // 筛选一下，搜索全文不筛选
      const list = this.currentTab === 'search' ? this.list : this.filterFiles(this.list, this.searchText.trim(), false)

      // 按照最近使用时间排序
      return this.sortList(list)
    }
  }
}
</script>

<style scoped>
.filter {
  width: 600px;
  background: #403e3e;
  margin: auto;
  padding: 10px;
}

.input {
  display: block;
  width: 100%;
  margin: 0;
  border: 0;
  font-size: 18px;
  line-height: 1.4em;
  padding: 6px;
  box-sizing: border-box;
  background: #333030;
  color: #ddd;
  transition: all .1s ease-in-out;
}

.input:focus {
  background: #242222;
}

.result {
  max-height: 300px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 6px 0;
}

.result li {
  color: #999;
  line-height: 1.5em;
  font-size: 18px;
  padding: 2px;
  transition: all .1s ease-in-out;
  cursor: pointer;
}

.result li.selected,
.result li:hover {
  padding: 2px 6px;
  background: #333030;
  color: #eee;
}

.result li span {
  vertical-align: middle
}

.result li span.path {
  font-size: 12px;
  color: #888;
  padding-left: .3em;
}

.result li span.path /deep/ b {
  color: #ababab;
  font-weight: bold;
}

.result li /deep/ b {
  color: #c6d2ca;
  font-weight: normal;
}

.tab {
  display: flex;
  margin-top: -8px;
}

.tab > div {
  flex: auto;
  text-align: center;
  line-height: 1.5em;
  font-size: 12px;
  padding: 4px 0;
  background: #403e3e;
  cursor: pointer;
  transition: all .1s ease-in-out;
  color: #ddd;
  border-right: 1px #313030 solid;
}

.tab > div:last-child {
  border-right: 0;
}

.tab > div:hover {
  background: #444141;
}

.tab > div.selected {
  background: #333030;
}
</style>
