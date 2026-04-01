<template>
  <div :class="['app-shell', { 'no-sidebar': !isAuthenticated }]">
    <aside v-if="isAuthenticated" class="side-nav">
      <div class="brand">
        <span class="brand-badge">HT</span>
        <div>
          <p class="brand-title">Happy Tenant</p>
          <small>Ops Console</small>
        </div>
      </div>

      <nav class="nav-links">
        <NuxtLink to="/dashboard" class="nav-link" active-class="is-active">
          <i class="pi pi-home"></i>
          <span>Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/entities/tenants" class="nav-link" active-class="is-active">
          <i class="pi pi-users"></i>
          <span>Tenants</span>
        </NuxtLink>
        <NuxtLink to="/entities/watchmen" class="nav-link" active-class="is-active">
          <i class="pi pi-shield"></i>
          <span>Watchmen</span>
        </NuxtLink>
        <NuxtLink to="/entities/support-tickets" class="nav-link" active-class="is-active">
          <i class="pi pi-inbox"></i>
          <span>Support Tickets</span>
        </NuxtLink>
      </nav>

      <div class="nav-footer">
        <Button label="Logout" icon="pi pi-sign-out" severity="contrast" class="logout-button" @click="handleLogout" />
      </div>
    </aside>

    <main :class="['main-region', { 'full-width': !isAuthenticated }]">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'

const authState = useState<boolean>('auth-state', () => false)
const isAuthenticated = computed(() => authState.value)
const route = useRoute()

const syncAuthState = () => {
  if (!process.client) {
    return
  }

  const token = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY)
  const role = localStorage.getItem(SUPABASE_USER_ROLE_KEY)
  authState.value = Boolean(token && role === 'authenticated')

  if (!authState.value && route.path !== '/login') {
    navigateTo('/login')
  }
}

const handleLogout = () => {
  if (process.client) {
    localStorage.removeItem(SUPABASE_ACCESS_TOKEN_KEY)
    localStorage.removeItem(SUPABASE_USER_ROLE_KEY)
  }

  authState.value = false
  navigateTo('/login')
}

const storageListener = (event: StorageEvent) => {
  if (
    event.key === SUPABASE_ACCESS_TOKEN_KEY ||
    event.key === SUPABASE_USER_ROLE_KEY ||
    event.key === null
  ) {
    syncAuthState()
  }
}

onMounted(() => {
  syncAuthState()

  if (process.client) {
    window.addEventListener('storage', storageListener)
  }
})

watch(
  () => route.path,
  () => {
    syncAuthState()
  }
)

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('storage', storageListener)
  }
})
</script>
