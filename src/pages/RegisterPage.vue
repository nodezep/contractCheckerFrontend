<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-md" style="width: 400px">
      <q-card-section>
        <div class="text-h6">Register</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input
            filled
            v-model="form.username"
            label="Username"
            lazy-rules
            :rules="[val => !!val || 'Username is required']"
          />

          <q-input
            filled
            v-model="form.email"
            label="Email"
            type="email"
            lazy-rules
            :rules="[
              val => !!val || 'Email is required',
              val => /.+@.+\..+/.test(val) || 'Email must be valid'
            ]"
          />

          <q-input
            filled
            v-model="form.password"
            label="Password"
            type="password"
            lazy-rules
            :rules="[
              val => !!val || 'Password is required',
              val => val.length >= 6 || 'Password must be at least 6 characters'
            ]"
          />

          <div>
            <q-btn
              label="Register"
              type="submit"
              color="primary"
              class="full-width"
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center">
        <router-link to="/login">Already have an account? Login</router-link>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api } from 'boot/axios'

export default {
  name: 'RegisterPage',
  data() {
    return {
      form: {
        username: '',
        email: '',
        password: ''
      },
      loading: false
    }
  },
  methods: {
    async onSubmit() {
      this.loading = true
      try {
        await api.post('/api/register/', this.form)
        this.$q.notify({
          color: 'positive',
          message: 'Registration successful! Please login.',
          icon: 'check'
        })
        this.$router.push('/login')
      } catch (error) {
        let message = 'Registration failed'
        if (error.response) {
          // Handle specific error messages from backend
          message = error.response.data.detail ||
                   error.response.data.message ||
                   'Registration failed. Please try again.'
        }
        this.$q.notify({
          color: 'negative',
          message,
          icon: 'report_problem'
        })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>