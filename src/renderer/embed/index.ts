const params = new URLSearchParams(location.search)

const title = params.get('title')
if (title) {
  document.title = title
}

const html = params.get('html') || ''
const div = document.getElementById('app')

const range = document.createRange()
range.selectNode(div!)
const ele = range.createContextualFragment(html)

div!.appendChild(ele)
