<template>
  <router-view :key="authStore.user ? 'logged-in' : 'logged-out'" />
</template>

<script setup>
import { useAuthStore } from 'stores/auth'

const authStore = useAuthStore()

// Auto-login on page refresh
if (authStore.token && !authStore.user) {
  authStore.fetchUser().catch((err) => {
    console.error('Auto login failed:', err)
  })
}
</script>
