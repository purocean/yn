import Markdown from 'markdown-it'

const markdownItPlugins: {plugin: any; params: any}[] = []

export const getPlugins = () => markdownItPlugins

export const ctx = {
  registerPlugin: (plugin: (md: Markdown, ...args: any) => void, params?: any) => {
    markdownItPlugins.push({ plugin, params })
  }
}
