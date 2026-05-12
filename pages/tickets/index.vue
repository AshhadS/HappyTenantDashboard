<template>
  <main class="tickets-page">
    <div class="page-shell">
      <Card class="tickets-hero">
        <template #content>
          <div class="tickets-hero__top">
            <div>
              <Tag value="Operations Hub" icon="pi pi-building" severity="warning" rounded />
              <h1>Building Operations</h1>
              <p>Select a building to manage incidents, maintenance tickets, sensors, and device health.</p>
            </div>
            <Button label="Refresh Buildings" icon="pi pi-refresh" :loading="loading" severity="info" @click="loadBuildings" />
          </div>
        </template>
      </Card>

      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

      <div v-if="loading" class="tickets-grid tickets-grid--loading">
        <Skeleton v-for="index in 4" :key="index" height="220px" borderRadius="1rem" />
      </div>

      <div v-else-if="buildingSummaries.length" class="tickets-grid">
        <BuildingSummaryCard
          v-for="summary in buildingSummaries"
          :key="summary.buildingId"
          :summary="summary"
          @select="router.push(`/tickets/${summary.buildingId}`)"
        />
      </div>

      <Message v-else severity="info" :closable="false">No accessible buildings were found for this account.</Message>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { BuildingOperationsSummary } from '~/types/buildingOperations'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'
import { useBuildingOperations } from '~/composables/useBuildingOperations'
import BuildingSummaryCard from '~/components/operations/BuildingSummaryCard.vue'

const router = useRouter()
const { fetchBuildingSummaries } = useBuildingOperations()

const loading = ref(false)
const errorMessage = ref('')
const token = ref('')
const role = ref('')
const userId = ref('')
const buildingSummaries = ref<BuildingOperationsSummary[]>([])

const loadBuildings = async () => {
  if (!token.value) {
    errorMessage.value = 'You are not signed in.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const result = await fetchBuildingSummaries(token.value, role.value, userId.value)
  buildingSummaries.value = result.data
  errorMessage.value = result.error || ''
  loading.value = false
}

onMounted(async () => {
  if (!process.client) {
    return
  }

  token.value = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
  userId.value = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''
  await loadBuildings()
})
</script>

<style scoped>
.tickets-page {
  min-height: 100vh;
  padding: 2rem 1rem 3rem;
  background: var(--color-soft-linen-300);
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1200px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tickets-hero :deep(.p-card-body) {
  border-radius: 1.25rem;
  background: var(--color-carbon-black-900);
  color: var(--color-soft-linen-50);
  padding: 1.25rem;
}

.tickets-hero__top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.tickets-hero h1 {
  margin: 0.45rem 0 0.2rem;
}

.tickets-hero p {
  margin: 0;
  color: rgba(243, 244, 241, 0.85);
}

.tickets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.9rem;
}

.tickets-grid--loading {
  align-items: stretch;
}
</style>
