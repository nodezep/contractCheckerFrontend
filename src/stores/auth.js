import { defineStore } from 'pinia'
import { LocalStorage } from 'quasar'
import { api } from 'boot/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: LocalStorage.getItem('user') || null,
    token: LocalStorage.getItem('token') || null,
    // Add a ready flag to track initialization
    _ready: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isReady: (state) => state._ready
  },

  actions: {
    async initialize() {
      if (this.token && !this.user) {
        await this.fetchUser()
      }
      this._ready = true
    },

    async login(credentials) {
      try {
        const params = new URLSearchParams()
        params.append('username', credentials.username)
        params.append('password', credentials.password)

        const response = await api.post('/api/token/', params)

        this.token = response.data.access_token
        LocalStorage.set('token', this.token)

        // Wait for user data to be fully loaded
        await this.fetchUser()

        return response.data
      } catch (error) {
        this.logout()
        throw new Error(error.response?.data?.detail || 'Login failed')
      }
    },

    async fetchUser() {
      try {
        const response = await api.get('/api/users/me/')
        this.user = response.data
        LocalStorage.set('user', this.user)
        return response.data
      } catch (error) {
        this.logout()
        throw error
      }
    },

    logout() {
      this.user = null
      this.token = null
      this._ready = false
      LocalStorage.remove('token')
      LocalStorage.remove('user')
    }
  }
})