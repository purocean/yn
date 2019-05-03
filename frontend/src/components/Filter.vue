<template>
  <div @keydown.tab.stop="switchTab()" @keydown.enter="chooseItem()" @keydown.up="selectItem(-1)" @keydown.down="selectItem(1)" class="filter" @click.stop>
    <div class="tab">
      <div @click="switchTab('file')" :class="{selected: currentTab === 'file'}">快速跳转</div>
      <div @click="switchTab('search')" :class="{selected: currentTab === 'search'}">搜索内容</div>
      <!-- <div>标签</div> -->
    </div>
    <input ref="input" v-model="searchText" type="text" class="input" @keydown.tab.prevent @keydown.up.prevent @keydown.down.prevent autofocus>
    <ul ref="result" class="result">
      <li v-if="list === null">加载中……</li>
      <template v-else>
        <li
          v-for="item in list"
          :key="item.path"
          :class="{selected: selected === item}"
          @click="chooseItem(item)">
          <span ref="fileName">
            {{item.name}}
          </span>
          <span ref="filePath" class="path">
            {{item.path.substr(0, item.path.lastIndexOf('/'))}}
          </span>
        </li>
        <li v-if="list.length < 1">无结果</li>
      </template>
    </ul>
  </div>
</template>

<script>
import _ from 'lodash'
import file from '../file'
import fuzzyMatch from '../fuzzyMatch'

export default {
  name: 'x-filter',
  components: {},
  props: {
    files: Array,
    repo: String
  },
  data () {
    return {
      selected: null,
      searchText: '',
      currentTab: 'file',
      list: [],
      lastFetchTime: 0
    }
  },
  created () {
    this.searchWithDebounce = _.debounce((text, call) => {
      if (this.repo && text.trim()) {
        const fetchTime = new Date().getTime()
        this.lastFetchTime = fetchTime
        file.search(this.repo, text.trim(), data => {
          // 总是保证最后的搜索结果出现在列表
          if (fetchTime >= this.lastFetchTime) {
            call(data)
          }
        })
      } else {
        this.list = []
      }
    }, 500)
  },
  mounted () {
    this.$refs.input.focus()
    this.updateDataSource()
  },
  beforeDestroy () {
  },
  methods: {
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
    filterFiles (files, search) {
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
        this.list = this.filterFiles(this.files, this.searchText.trim())
        this.sortList()
      } else {
        this.list = null
        this.searchWithDebounce(this.searchText.trim(), data => {
          this.list = data
          this.sortList()
        })
      }

      this.$nextTick(this.highlightText(this.searchText.trim()))
    },
    updateSelected (item = null) {
      if (this.list === null) {
        return
      }

      if (item) {
        this.selected = item
      } else {
        this.selected = this.list.length > 0 ? this.list[0] : null
      }

      this.$nextTick(() => {
        const li = this.$refs.result.querySelector('li.selected')
        if (li) {
          li.scrollIntoViewIfNeeded()
        }
      })
    },
    selectItem (inc) {
      if (this.list.length < 1) {
        this.updateSelected()
        return
      }

      const currentIndex = this.list.findIndex(x => this.selected === x)

      let index = currentIndex + inc
      if (index > this.list.length - 1) {
        index = 0
      } else if (index < 0) {
        index = this.list.length - 1
      }

      this.updateSelected(this.list[index])
    },
    chooseItem (item = null) {
      const file = item || this.selected
      if (file) {
        this.$emit('choose-file', file)
      }
    },
    switchTab (tab = null) {
      if (tab) {
        this.currentTab = tab
        return
      }

      if (this.currentTab === 'file') {
        this.currentTab = 'search'
      } else if (this.currentTab === 'search') {
        this.currentTab = 'file'
      }
    },
    sortList () {
      if (this.list === null) {
        return
      }

      const json = window.localStorage[`${this.repo}_open_time`] || '{}'

      let map = {}
      try {
        map = JSON.parse(json)
      } catch (error) {
      }

      this.list.sort((a, b) => {
        const at = map[a.path] || 0
        const bt = map[b.path] || 0

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
    currentTab () {
      this.list = null
      this.$refs.input.focus()
      this.updateDataSource()
    }
  },
  computed: {
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
  transition: all .2s ease-in-out;
}

.tab > div:hover {
  background: #444141;
}

.tab > div.selected {
  background: #333030;
}
</style>
