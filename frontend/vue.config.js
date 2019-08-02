module.exports = {
  devServer: {
    port: 8066,
    proxy: {
      '/static': {
        target: 'http://localhost:3000'
      },
      '/api': {
        target: 'http://localhost:3000'
      },
      '/ws': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  chainWebpack: config => {
    config.plugin('copy').tap(args => {
      args[0][0].from = 'node_modules/monaco-editor/min/vs'
      args[0][0].to = 'vs'
      return args
    })
  }
}
