import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import {useCounterStore} from "stores/example-store";

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })
  Router.beforeEach((to, from, next) => {
    const store = useCounterStore()

    // 🔐 Requiere login
    if (to.matched.some(r => r.meta.requiresAuth)) {
      if (!store.isLogged) {
        return next('/login')
      }

      // 🔐 Requiere permiso específico
      const requiredPerm = to.meta.perm
      if (requiredPerm) {
        if (!store.permissions.includes(requiredPerm)) {
          // 🚫 No autorizado
          return next('/') // o a una página 403
        }
      }

      return next()
    }

    next()
  })

  return Router
})
