<template>
  <div class="index-redirect">
    <p>Redirecting…</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'

const config = useRuntimeConfig()
const postLoginRoute = config.public.postLoginRoute || '/dashboard'

const isRoleAllowed = (role: string | null) => role === 'authenticated' || role === 'LANDLORD' || role === 'WATCHMAN'

onMounted(() => {
  if (!process.client) {
    return
  }

  const token = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY)
  const role = localStorage.getItem(SUPABASE_USER_ROLE_KEY)

  if (token && isRoleAllowed(role)) {
    navigateTo(postLoginRoute, { replace: true })
  } else {
    navigateTo('/login', { replace: true })
  }
})
</script>

<style scoped>
.index-redirect {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #475569;
}
</style>
