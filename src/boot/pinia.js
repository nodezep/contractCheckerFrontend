import { createPinia } from 'pinia'

export default ({ app }) => {
  const pinia = createPinia()
  app.use(pinia)
  app.config.globalProperties.$pinia = pinia // Optional, only if needed elsewhere
}