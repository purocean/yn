<template>
  <div @keydown.enter="chooseItem()" @keydown.up="selectItem(-1)" @keydown.down="selectItem(1)" class="filter" @click.stop="nope">
    <input @keydown.up.prevent="nope" @keydown.down.prevent="nope" ref="input" v-model="searchText" type="text" class="input" autofocus>
    <ul ref="result" class="result">
      <li
        v-for="item in list"
        :key="item.path"
        :class="{selected: selected === item}"
        @click="chooseItem(item)">
          <span>
            {{item.name}}
          </span>
          <span class="path">
            {{item.path.substr(0, item.path.lastIndexOf('/'))}}
          </span>
        </li>
      <li v-if="list.length < 1">无结果</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'x-filter',
  components: {},
  props: {
    files: Array
  },
  data () {
    return {
      selected: null,
      searchText: ''
    }
  },
  mounted () {
    this.$refs.input.focus()
    this.updateSelected()
  },
  beforeDestroy () {
  },
  methods: {
    nope () {
      // nope
    },
    updateSelected (item = null) {
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
      if (item) {
        this.$emit('choose-item', item)
      } else if (this.selected) {
        this.$emit('choose-item', this.selected)
      }
    }
  },
  watch: {
    list () {
      this.updateSelected()
    }
  },
  computed: {
    list () {
      return this.files.filter(x => x.path.toLowerCase().indexOf(this.searchText.toLowerCase()) > -1)
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
</style>
