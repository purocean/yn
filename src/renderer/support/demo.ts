import { FLAG_DEMO } from './global-args'
import { useToast } from './toast'

if (FLAG_DEMO) {
  localStorage.clear()

  const xFetch = window.fetch
  const cache: {[key: string]: string} = {}

  window.addEventListener('click', e => {
    const target = e.target as HTMLElement
    if (target.parentElement?.tagName === 'FORM' && target.innerText.includes('docx')) {
      const message = 'DEMO 模式下该功能不可用'
      useToast().show('warning', message)

      e.preventDefault()
      e.stopPropagation()
    }
  }, true)

  window.addEventListener('error', e => {
    const target = e.target as HTMLImageElement
    if (target.tagName === 'IMG') {
      if (target.src.includes('/api/plantuml')) {
        target.src = 'data:image/png;base64,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'
      } else if (target.src.includes('/api/help')) {
        const url = new URL(target.src)
        const path = url.searchParams.get('path')
        if (path) {
          target.src = path.replace(/^.\//, '/')
        }
      }
    } else {
      console.error(e)
    }
  }, true)

  window.fetch = (uri: any, init: any) => Promise.resolve({
    json: () => {
      console.log('mock api >', uri, init)

      const url = new URL(location.origin + uri)
      const method = (init && init.method) || 'GET'

      if (uri.startsWith('/api/settings')) {
        return Promise.resolve({ status: 'ok', message: '获取成功', data: {
          repositories: { test: '/path_test' },
          shell: 'bash'
        } })
      }

      if (uri.startsWith('/api/mark')) {
        return Promise.resolve({ status: 'ok', message: '操作成功', data: {} })
      }

      if (uri.startsWith('/api/repositories')) {
        return Promise.resolve({ status: 'ok', message: '获取成功', data: { test: '/test' } })
      }

      if (uri.startsWith('/api/tree')) {
        return Promise.resolve({ status: 'ok', message: '获取成功', data: [{ name: '/', type: 'dir', path: '/', repo: 'test', children: [{ name: '工作', path: '工作', type: 'dir', repo: 'test', children: [{ name: '1.md', path: '工作/1.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635402958.447, mtime: 1623635402958.447 }, { name: '2.md', path: '工作/2.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635406528.4639, mtime: 1623635406528.4639 }, { name: '3.md', path: '工作/3.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635410176.051, mtime: 1623635410177.0498 }] }, { name: '学习', path: '学习', type: 'dir', repo: 'test', children: [{ name: 'a.md', path: '学习/a.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635423871.2678, mtime: 1623635423871.2678 }, { name: 'b.md', path: '学习/b.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635427472.3079, mtime: 1623635427472.3079 }, { name: 'c.md', path: '学习/c.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635431935.041, mtime: 1623635431935.041 }] }, { name: 'TEST.md', path: 'TEST.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635389096.3315, mtime: 1623635389097.3403 }, { name: 'TODO.md', path: 'TODO.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635437968.1262, mtime: 1623635437969.1235 }, { name: '重要账号.c.md', path: '重要账号.c.md', type: 'file', repo: 'test', marked: false, birthtime: 1623635542753.2976, mtime: 1623635542753.2976 }] }] })
      }

      if (uri.startsWith('/api/help') || uri.startsWith('/api/file')) {
        if (method === 'POST') {
          return Promise.resolve({ status: 'ok', message: '保存成功' })
        } else if (method === 'GET') {
          const path = '/' + (url.searchParams.get('doc') || 'FEATURES.md')
          const data = {
            status: 'ok',
            message: '获取成功',
            data: {
              content: '',
              hash: 'test'
            }
          }

          const message = (url.searchParams.get('doc') ? '' : '当前处于 DEMO 模式，部分功能不可用{style="color: red; font-size: 30px"}\n\n')

          if (cache[path]) {
            data.data.content = message + cache[path]
            return Promise.resolve(data)
          }

          return xFetch(path).then(res => res.text()).then(md => {
            cache[path] = md
            data.data.content = message + md
            return data
          })
        }
      }

      const message = 'DEMO 模式下该功能不可用'
      useToast().show('warning', message)

      return Promise.resolve({ status: 'error', message })
    }
  } as any)
}
