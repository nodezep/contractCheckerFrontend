<template>
  <q-page padding class="flex flex-center">
    <q-card class="q-pa-md" style="width: 400px">
      <q-card-section>
        <div class="text-h6">Login</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleLogin">
          <q-input
            v-model="credentials.username"
            label="Username"
            outlined
            class="q-mb-md"
            :rules="[val => !!val || 'Username is required']"
          />
          <q-input
            v-model="credentials.password"
            label="Password"
            type="password"
            outlined
            class="q-mb-md"
            :rules="[val => !!val || 'Password is required']"
          />
          <q-btn
            type="submit"
            label="Login"
            color="primary"
            class="full-width"
            :loading="loading"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { ref } from 'vue'
import { useAuthStore } from "stores/auth"
import { useQuasar } from "quasar"
import { useRouter } from "vue-router"

export default {
  setup() {
    const $q = useQuasar()
    const auth = useAuthStore()
    const router = useRouter()

    const credentials = ref({
      username: '',
      password: ''
    })
    const loading = ref(false)

    const handleLogin = async () => {
      loading.value = true
      try {
        await auth.login(credentials.value)
        $q.notify({
          type: 'positive',
          message: 'Login successful'
        })
        router.push('/')
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Login failed'
        })
      } finally {
        loading.value = false
      }
    }

    return {
      credentials,
      loading,
      handleLogin
    }
  }
}
</script>
