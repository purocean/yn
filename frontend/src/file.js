export default {
  read: (path, call) => {
    fetch(`/api/file?path=${encodeURIComponent(path)}`).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result.data)
        }
      })
    })
  },
  write: (path, content, call) => {
    fetch('/api/file', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({path, content})
    }).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        }
      })
    })
  },
  tree: call => {
    fetch('/api/tree').then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result.data)
        }
      })
    })
  },
  delete: (path, call) => {
    fetch(`/api/file?path=${encodeURIComponent(path)}`, {method: 'DELETE'}).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        }
      })
    })
  }
}
