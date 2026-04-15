<template>
  <div :class="['app-shell', { 'no-sidebar': !isAuthenticated }]">
    <aside v-if="isAuthenticated" class="side-nav">
      <div class="brand">
        <span class="brand-badge">H</span>
        <div>
          <p class="brand-title">{{ displayName }}</p>
          <small>{{ displayRole }}</small>
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
        <NuxtLink to="/buildings" class="nav-link" active-class="is-active">
          <i class="pi pi-building"></i>
          <span>Buildings</span>
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
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY, SUPABASE_USER_ID_KEY } from '~/composables/useSupabaseAuth'

const authState = useState<boolean>('auth-state', () => false)
const isAuthenticated = computed(() => authState.value)
const route = useRoute()

const isRoleAllowed = (role: string | null) => role === 'authenticated' || role === 'LANDLORD'

const displayName = ref('Happy Tenant')
const displayRole = ref('Ops Console')

const syncAuthState = () => {
  if (!process.client) {
    return
  }

  const token = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY)
  const role = localStorage.getItem(SUPABASE_USER_ROLE_KEY)
  const email = localStorage.getItem('supabase.user.email')
  authState.value = Boolean(token && isRoleAllowed(role))
  displayRole.value = role === 'LANDLORD' ? 'Landlord' : role ? role : 'Guest'
  displayName.value = email || 'Happy Tenant'

  if (!authState.value && route.path !== '/login') {
    navigateTo('/login')
  }
}

const handleLogout = () => {
  if (process.client) {
    localStorage.removeItem(SUPABASE_ACCESS_TOKEN_KEY)
    localStorage.removeItem(SUPABASE_USER_ROLE_KEY)
    localStorage.removeItem(SUPABASE_USER_ID_KEY)
    localStorage.removeItem('supabase.user.email')
  }

  authState.value = false
  navigateTo('/login')
}

const storageListener = (event: StorageEvent) => {
  if (
    event.key === SUPABASE_ACCESS_TOKEN_KEY ||
    event.key === SUPABASE_USER_ROLE_KEY ||
    event.key === SUPABASE_USER_ID_KEY ||
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
