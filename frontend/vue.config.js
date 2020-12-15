module.exports = {
  devServer: {
    port: 8066,
    proxy: {
      '/static': {
        target: 'http://localhost:3044'
      },
      '/api': {
        target: 'http://localhost:3044'
      },
      '/ws': {
        target: 'http://localhost:3044',
        ws: true
      }
    }
  },
  chainWebpack: config => {
    config.plugin('copy').tap(args => {
      args[0][0].from = 'node_modules/monaco-editor/min/vs'
      args[0][0].to = 'vs'
      args[0][1] = {
        from: 'public/*.*',
        to: '[name].[ext]',
        toType: 'template'
      }
      return args
    })
  }
}
