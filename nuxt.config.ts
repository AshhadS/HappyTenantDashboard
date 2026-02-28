export default defineNuxtConfig({
  modules: ['@primevue/nuxt-module'],
  css: ['~/assets/css/main.css', 'primeicons/primeicons.css'],
  primevue: {
    options: {
      unstyled: false
    }
  },
  devtools: {
    enabled: true
  },
  compatibilityDate: '2025-07-15'
})
