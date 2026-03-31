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
      supabaseUrl: process.env.SUPABASE_URL || 'https://hcaghgqmfiovjtfkzrox.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYWdoZ3FtZmlvdmp0Zmt6cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMTA0NzYsImV4cCI6MjA3MDU4NjQ3Nn0.Rwm2qTESdeDg3Rm0uplxLOjbJT8rkhhjaZhHEeG5xJU',
      postLoginRoute: process.env.POST_LOGIN_ROUTE || '/dashboard',
      forgotPasswordRoute: process.env.FORGOT_PASSWORD_ROUTE || '/forgot-password'
    }
  },
  devtools: {
    enabled: true
  },
  compatibilityDate: '2025-07-15'
})
