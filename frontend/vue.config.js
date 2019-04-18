module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000'
      },
      '/ws': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
}
