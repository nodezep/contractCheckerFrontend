import { route } from 'quasar/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth'

export default route(function (/* { stores, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // ✅ Route Guard
  Router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    console.log('[Router] Navigating to:', to?.path, '| Auth token:', authStore.token)

    // Defensive check
    if (!to) {
      console.warn('[Router] Missing target route')
      return true
    }

    // Requires authentication and user is not logged in
    if (to.meta.requiresAuth && !authStore.token) {
      return {
        path: '/login',
        query: { redirect: to.fullPath || '/' }
      }
    }

    // Guest-only route but user is already logged in
    if (to.meta.requiresGuest && authStore.token) {
      return { path: '/' }
    }

    // Authenticated routes: ensure user info is fetched
    if (to.meta.requiresAuth) {
      try {
        await authStore.fetchUser()
      } catch (err) {
        console.warn('[Router] Token invalid or fetchUser failed:', err.message || err)
        return {
          path: '/login',
          query: { redirect: to.fullPath || '/' }
        }
      }
    }

    return true
  })

  return Router
})
