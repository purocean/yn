import Vue from 'vue'
import Vuex from 'vuex'

import app from './app'

Vue.use(Vuex)

export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  modules: {
    app,
  }
})
