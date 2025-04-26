<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold">
          Contract Analysis Suite
        </q-toolbar-title>

        <q-space />

        <div v-if="authStore.user" class="q-mr-sm">
          Welcome, {{ authStore.user.username }}
        </div>

        <q-btn
          v-if="authStore.user"
          flat
          icon="logout"
          label="Logout"
          @click="handleLogout"
        />
        <q-btn
          v-else
          flat
          icon="login"
          label="Login"
          to="/login"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

// 🔥 Refetch user if token exists
onMounted(async () => {
  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchUser()
    } catch (err) {
      console.error('Error loading user from token:', err)
    }
  }
})
</script>

<style>
.q-header {
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
}
.q-toolbar {
  min-height: 64px;
}
.q-page-container {
  padding-top: 20px;
}
</style>
