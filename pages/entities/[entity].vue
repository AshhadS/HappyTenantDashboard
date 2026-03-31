<template>
  <main class="entity-page">
    <div class="page-shell">
      <Button label="Back to dashboard" icon="pi pi-arrow-left" text severity="secondary" @click="router.push('/dashboard')" />

      <Card v-if="activeEntity" class="entity-hero">
        <template #content>
          <div class="hero-body">
            <div>
              <Tag value="Live data" icon="pi pi-sync" severity="warning" rounded />
              <h1>{{ activeEntity.label }} directory</h1>
              <p>{{ activeEntity.description }}</p>
            </div>

            <div class="hero-actions">
              <Button label="Refresh list" icon="pi pi-refresh" :loading="loading" severity="info" @click="loadRows" />
            </div>
          </div>

          <div class="hero-stats">
            <div class="hero-stat">
              <span>Records loaded</span>
              <p>{{ rows.length }}</p>
            </div>
            <div class="hero-stat">
              <span>Last synced</span>
              <p>{{ lastSyncedText }}</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="entity-data-card">
        <template #title>{{ activeEntity?.label ?? 'Unknown list' }}</template>
        <template #content>
          <Message v-if="!activeEntity" severity="warn" :closable="false">
            This list does not exist. Please go back and choose another dashboard card.
          </Message>
          <Message v-else-if="!isAllowed" severity="warn" :closable="false">
            You are signed in as <strong>{{ role || 'user' }}</strong>. Only super admins can open this list.
          </Message>
          <Message v-else-if="errorMessage" severity="error" :closable="false">
            {{ errorMessage }}
          </Message>

          <div v-else>
            <div v-if="loading" class="table-loading">
              <Skeleton height="3.5rem" borderRadius="12px" />
              <Skeleton height="3.5rem" borderRadius="12px" />
              <Skeleton height="3.5rem" borderRadius="12px" />
            </div>

            <template v-else>
              <DataTable
                v-if="rows.length"
                :value="rows"
                dataKey="id"
                size="small"
                stripedRows
                rowHover
                showGridlines
                scrollable
                scrollHeight="480px"
                :loading="loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 20, 30, 50]"
                class="entity-table"
              >
                <template #header>
                  <div class="table-header">
                    <span>{{ rows.length }} records loaded</span>
                    <Tag value="PrimeVue DataTable" icon="pi pi-table" severity="info" rounded />
                  </div>
                </template>

                <Column
                  v-for="column in visibleColumns"
                  :key="column.field"
                  :field="column.field"
                  :header="column.header"
                  sortable
                >
                  <template #body="{ data }">
                    {{ formatCell(data[column.field]) }}
                  </template>
                </Column>
              </DataTable>

              <Message v-else severity="info" :closable="false">No records exist yet. Try refreshing later.</Message>
            </template>
          </div>
        </template>
      </Card>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'

type EntitySlug = 'tenants' | 'watchmen' | 'support-tickets'

interface EntityDefinition {
  label: string
  table: string
  description: string
  columns: { field: string; header: string }[]
}

const entityDefinitions: Record<EntitySlug, EntityDefinition> = {
  tenants: {
    label: 'Tenants',
    table: 'tenant',
    description: 'Track everyone who currently lives on the property along with their units and contacts.',
    columns: [
      { field: 'full_name', header: 'Name' },
      { field: 'unit_number', header: 'Unit' },
      { field: 'phone', header: 'Phone' },
      { field: 'status', header: 'Status' }
    ]
  },
  watchmen: {
    label: 'Watchmen',
    table: 'watchman',
    description: 'Stay on top of guard schedules, shift coverage, and their contact information.',
    columns: [
      { field: 'full_name', header: 'Name' },
      { field: 'shift', header: 'Shift' },
      { field: 'phone', header: 'Phone' },
      { field: 'status', header: 'Status' }
    ]
  },
  'support-tickets': {
    label: 'Support Tickets',
    table: 'support_ticket',
    description: 'Review every resident request and make sure the right team is following up.',
    columns: [
      { field: 'subject', header: 'Subject' },
      { field: 'status', header: 'Status' },
      { field: 'priority', header: 'Priority' },
      { field: 'created_at', header: 'Created' }
    ]
  }
}

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

const role = ref('')
const loading = ref(false)
const errorMessage = ref('')
const supabaseAccessToken = ref('')
const rows = ref<Record<string, unknown>[]>([])
const lastFetched = ref<Date | null>(null)

const supabaseUrl = runtimeConfig.public.supabaseUrl
const supabaseAnonKey = runtimeConfig.public.supabaseAnonKey

const entitySlug = computed<EntitySlug | null>(() => {
  const value = String(route.params.entity || '').toLowerCase()

  if (value === 'tenants' || value === 'watchmen' || value === 'support-tickets') {
    return value
  }

  return null
})

const activeEntity = computed(() => (entitySlug.value ? entityDefinitions[entitySlug.value] : null))
const isAllowed = computed(() => role.value === 'authenticated')
const visibleColumns = computed(() => {
  if (!activeEntity.value) {
    return []
  }

  const hints = activeEntity.value.columns

  if (!rows.value.length) {
    return hints.slice(0, 4)
  }

  const available = hints.filter((hint) => rows.value.some((row) => Object.prototype.hasOwnProperty.call(row, hint.field)))

  if (available.length) {
    return available
  }

  const fallbackFields = Object.keys(rows.value[0]).filter((field) => field !== 'id').slice(0, 4)

  return fallbackFields.map((field) => ({ field, header: prettifyField(field) }))
})

const lastSyncedText = computed(() => {
  if (!lastFetched.value) {
    return '--'
  }

  return lastFetched.value.toLocaleString()
})

const formatCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return '--'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

const prettifyField = (field: string) =>
  field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())

const loadRows = async () => {
  if (!activeEntity.value) {
    errorMessage.value = 'Unknown list.'
    return
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    errorMessage.value = 'Supabase configuration is missing.'
    return
  }

  if (!supabaseAccessToken.value) {
    errorMessage.value = 'You are not signed in. Please log in first.'
    return
  }

  if (!isAllowed.value) {
    return
  }

  if (loading.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const data = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/${activeEntity.value.table}`, {
      method: 'GET',
      query: {
        select: '*'
      },
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAccessToken.value}`,
        Range: '0-49',
        'Range-Unit': 'items'
      }
    })

    rows.value = data || []
    lastFetched.value = new Date()
  } catch (error) {
    const err = error as { data?: { message?: string; error_description?: string } }
    errorMessage.value = err?.data?.message ?? err?.data?.error_description ?? 'Unable to load records.'
  } finally {
    loading.value = false
  }
}

const hydrateSession = () => {
  if (!process.client) {
    return
  }

  supabaseAccessToken.value = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
}

onMounted(async () => {
  hydrateSession()

  if (supabaseAccessToken.value && isAllowed.value && activeEntity.value) {
    await loadRows()
  }
})

watch(
  () => route.params.entity,
  async () => {
    rows.value = []
    errorMessage.value = ''
    lastFetched.value = null

    if (supabaseAccessToken.value && isAllowed.value && activeEntity.value) {
      await loadRows()
    }
  }
)

watch(
  () => [supabaseAccessToken.value, isAllowed.value],
  async () => {
    if (supabaseAccessToken.value && isAllowed.value && activeEntity.value) {
      await loadRows()
    }
  }
)
</script>

<style scoped>
.entity-page {
  min-height: 100vh;
  padding: 2.5rem 1rem 4rem;
  background: radial-gradient(circle at top left, #fce7f3, transparent 50%),
    radial-gradient(circle at 20% 80%, #bfdbfe, transparent 45%),
    radial-gradient(circle at right, #fef3c7, transparent 40%), #0f172a;
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1100px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.entity-hero :deep(.p-card-body) {
  border-radius: 1.4rem;
  padding: 2rem;
  background: linear-gradient(135deg, #2563eb, #a855f7, #fb923c);
  color: #fff;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.5);
}

.hero-body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.entity-hero h1 {
  margin: 0.5rem 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 700;
}

.entity-hero p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
}

.hero-stats {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.hero-stat {
  background: rgba(15, 23, 42, 0.25);
  border-radius: 1rem;
  padding: 1rem;
}

.hero-stat span {
  opacity: 0.8;
}

.hero-stat p {
  margin: 0.2rem 0 0;
  font-size: 1.8rem;
  font-weight: 600;
}

.entity-data-card :deep(.p-card-body) {
  border-radius: 1.2rem;
  padding: 1.75rem;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 15px 40px rgba(15, 23, 42, 0.18);
}

.table-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.entity-table :deep(.p-datatable-wrapper) {
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-weight: 600;
  color: #0f172a;
}

@media (max-width: 640px) {
  .entity-page {
    padding: 1.5rem 1rem 2.5rem;
  }

  .entity-hero :deep(.p-card-body) {
    padding: 1.5rem;
  }
}
</style>
