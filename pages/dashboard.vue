<template>
  <main class="dashboard-page">
    <Card class="dashboard-card">
      <template #title>Admin Dashboard</template>
      <template #subtitle>Overview of operational counts.</template>
      <template #content>
        <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
        <Message v-else-if="role !== 'super_admin'" severity="warn" :closable="false">
          You are signed in as <strong>{{ role || 'user' }}</strong>. Dashboard cards are available for super admins only.
        </Message>

        <div v-else class="stats-grid">
          <Card class="stat-card">
            <template #title>Tenants</template>
            <template #content>
              <p class="count">{{ loading ? '...' : counts.tenant }}</p>
            </template>
          </Card>

          <Card class="stat-card">
            <template #title>Watchmen</template>
            <template #content>
              <p class="count">{{ loading ? '...' : counts.watchman }}</p>
            </template>
          </Card>

          <Card class="stat-card">
            <template #title>Support Tickets</template>
            <template #content>
              <p class="count">{{ loading ? '...' : counts.support_tickets }}</p>
            </template>
          </Card>
        </div>
      </template>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'

const role = ref('')
const loading = ref(false)
const errorMessage = ref('')
const counts = reactive({
  tenant: 0,
  watchman: 0,
  support_tickets: 0
})

const { getTableCount } = useSupabaseAuth()

onMounted(async () => {
  if (!process.client) {
    return
  }

  const accessToken = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY)
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''

  if (!accessToken) {
    errorMessage.value = 'You are not signed in. Please log in first.'

    return
  }

  if (role.value !== 'super_admin') {
    return
  }

  loading.value = true

  const [tenantResult, watchmanResult, supportTicketsResult] = await Promise.all([
    getTableCount('tenant', accessToken),
    getTableCount('watchman', accessToken),
    getTableCount('support_tickets', accessToken)
  ])

  loading.value = false

  counts.tenant = tenantResult.count || 0
  counts.watchman = watchmanResult.count || 0
  counts.support_tickets = supportTicketsResult.count || 0

  errorMessage.value = tenantResult.error || watchmanResult.error || supportTicketsResult.error || ''
})
</script>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: #f6f8fb;
}

.dashboard-card {
  width: min(100%, 900px);
}

.stats-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  border-radius: 14px;
}

.count {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #1d4ed8;
}
</style>
