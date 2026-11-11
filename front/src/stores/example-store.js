import { defineStore, acceptHMRUpdate } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    counter: 0,
    user: {},
    socketAnalitica: false,
    isLogged: localStorage.getItem('tokenTicket') ? true : false,
    permissions: [],
    menuEventosByPais: [],
  }),

  getters: {
    doubleCount: (state) => state.counter * 2
  },

  actions: {
    increment() {
      this.counter++
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))
}
