<template>
  <div class="app-shell">
    <aside class="side-nav">
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

    <main class="main-region">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'

const handleLogout = () => {
  if (process.client) {
    localStorage.removeItem(SUPABASE_ACCESS_TOKEN_KEY)
    localStorage.removeItem(SUPABASE_USER_ROLE_KEY)
  }

  navigateTo('/login')
}
</script>
