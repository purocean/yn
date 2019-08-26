import Storage from '@/lib/Storage'
import file from '@/lib/file'

const getLastOpenFile = repo => {
  const currentFile = Storage.get('currentFile')
  const recentOpenTime = Storage.get('recentOpenTime', {})

  if (!repo) {
    return null
  }

  if (currentFile && currentFile.repo === repo.name) {
    return currentFile
  }

  const item = Object.entries(recentOpenTime)
    .filter(x => x[0].startsWith(repo.name + '|'))
    .sort((a, b) => b[1] - a[1])[0]

  if (!item) {
    return null
  }

  const path = item[0].split('|', 2)[1]
  if (!path) {
    return null
  }

  return { repo: repo.name, name: file.basename(path), path }
}

export default {
  namespaced: true,
  state: {
    repositories: {},
    tree: null,
    showSide: true,
    showView: true,
    showXterm: false,
    savedAt: null,
    currentContent: '',
    previousContent: '',
    previousHash: '',
    currentRepo: Storage.get('currentRepo'),
    currentFile: getLastOpenFile(Storage.get('currentRepo')),
    recentOpenTime: Storage.get('recentOpenTime', {}),
    passwordHash: {},
    documentInfo: {
      textLength: 0,
      selectedLength: 0,
      lineCount: 0,
      line: 0,
      column: 0
    },
    markedFiles: [],
  },
  mutations: {
    setMarkedFiles (state, files) {
      state.markedFiles = files
    },
    setPasswordHash (state, { file, passwordHash }) {
      if (file && passwordHash) {
        state.passwordHash = { ...state.passwordHash, [`${file.repo}|${file.path}`]: passwordHash }
      }
    },
    setRepositories (state, data) {
      state.repositories = data
    },
    setTree (state, data) {
      state.tree = data
    },
    setShowView (state, data) {
      state.showView = data
    },
    setShowSide (state, data) {
      state.showSide = data
    },
    setShowXterm (state, data) {
      state.showXterm = data
    },
    setPreviousHash (state, data) {
      state.previousHash = data
    },
    setPreviousContent (state, data) {
      state.previousContent = data
    },
    setSavedAt (state, data) {
      state.savedAt = data
    },
    setDocumentInfo (state, data) {
      state.documentInfo = data
    },
    setCurrentContent (state, data) {
      state.currentContent = data
    },
    setCurrentRepo (state, data) {
      state.currentRepo = data
      state.currentFile = getLastOpenFile(data)
      state.tree = null
      Storage.set('currentRepo', data)
    },
    setCurrentFile (state, data) {
      state.currentFile = data
      Storage.set('currentFile', data)

      if (data) {
        state.recentOpenTime = { ...(state.recentOpenTime || {}), [`${data.repo}|${data.path}`]: new Date().valueOf() }
        Storage.set('recentOpenTime', state.recentOpenTime)
      }
    },
  },
  getters: {
  },
  actions: {
    async fetchMarkedFiles ({ commit }) {
      const files = (await file.markedFiles()).map(x => ({ ...x, name: file.basename(x.path) }))
      commit('setMarkedFiles', files)
    },
    async fetchRepositories ({ commit }) {
      const data = await file.fetchRepositories()
      commit('setRepositories', data)
    },
    async fetchTree ({ commit }, repo) {
      if (!repo) {
        console.warn('未选择仓库')
        return
      }

      const tree = await file.fetchTree(repo.name)
      commit('setTree', tree)
    },
    async showHelp ({ commit }, doc) {
      const content = await file.fetchHelpContent(doc)
      commit('setCurrentFile', {
        repo: '__help__',
        title: doc,
        name: doc,
        path: '/' + doc,
        content
      })
    },
  }
}
