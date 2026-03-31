export default defineNuxtConfig({
  modules: ['@primevue/nuxt-module'],
  css: ['~/assets/css/main.css', 'primeicons/primeicons.css'],
  primevue: {
    options: {
      unstyled: false
    }
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      postLoginRoute: process.env.POST_LOGIN_ROUTE || '/dashboard',
      forgotPasswordRoute: process.env.FORGOT_PASSWORD_ROUTE || '/forgot-password'
    }
  },
  devtools: {
    enabled: true
  },
  compatibilityDate: '2025-07-15'
})
