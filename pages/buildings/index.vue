<template>
  <main class="buildings-page">
    <div class="page-shell">
      <Card class="buildings-hero">
        <template #content>
          <div class="buildings-hero__layout">
            <div>
              <Tag value="Community Trust Indicators" icon="pi pi-verified" severity="warning" rounded />
              <h1>Building Transparency</h1>
              <p>
                Compare trust performance across buildings with score clarity, reliability signals, and maintenance
                accountability.
              </p>
            </div>
            <div class="buildings-hero__meta">
              <div class="meta-box">
                <span>Buildings</span>
                <strong>{{ filteredItems.length }}</strong>
              </div>
              <div class="meta-box">
                <span>Avg Score</span>
                <strong>{{ averageScore }}</strong>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <Card class="toolbar-card">
        <template #content>
          <div class="toolbar-grid">
            <IconField>
              <InputIcon class="pi pi-search" />
              <InputText v-model="searchTerm" placeholder="Search by building name or id" class="w-full" />
            </IconField>

            <Select
              v-model="sortKey"
              :options="sortOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Sort by"
              class="w-full"
            />

            <Select
              v-model="scoreBand"
              :options="scoreBands"
              optionLabel="label"
              optionValue="value"
              placeholder="Score band"
              class="w-full"
            />

            <div class="toolbar-toggles">
              <Button
                label="Has Badges"
                icon="pi pi-star"
                :severity="hasBadgesOnly ? 'warning' : 'secondary'"
                :outlined="!hasBadgesOnly"
                @click="hasBadgesOnly = !hasBadgesOnly"
              />
              <Button
                label="Low Confidence"
                icon="pi pi-info-circle"
                :severity="lowConfidenceOnly ? 'danger' : 'secondary'"
                :outlined="!lowConfidenceOnly"
                @click="lowConfidenceOnly = !lowConfidenceOnly"
              />
            </div>
          </div>
        </template>
      </Card>

      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

      <div v-else-if="loading" class="building-grid loading">
        <Card v-for="index in 6" :key="`building-skeleton-${index}`" class="building-card">
          <template #content>
            <Skeleton height="8rem" borderRadius="1rem" />
          </template>
        </Card>
      </div>

      <Message v-else-if="!filteredItems.length" severity="info" :closable="false">
        No buildings match your current search and filters.
      </Message>

      <div v-else class="building-grid">
        <Card v-for="building in filteredItems" :key="building.building_id" class="building-card">
          <template #content>
            <div class="building-card__head">
              <BuildingScoreRing :score="building.transparency_score" />
              <div class="building-card__identity">
                <h3>{{ building.building_name || 'Unnamed Building' }}</h3>
                <div class="identity-row">
                  <code>{{ building.building_id }}</code>
                  <Button
                    icon="pi pi-copy"
                    text
                    size="small"
                    aria-label="Copy building id"
                    @click="copyBuildingId(building.building_id)"
                  />
                </div>
                <div class="identity-tags">
                  <Tag :value="confidenceLabel(building.confidence_score)" severity="contrast" rounded />
                  <BuildingTrendPill :trend="building.trend_vs_previous" />
                  <BuildingReliabilityTag
                    :label="reliabilityLabel(building.transparency_score, building.confidence_score, building.overdue_rate)"
                  />
                </div>
              </div>
            </div>

            <div class="building-stats">
              <div>
                <span>Tickets</span>
                <strong>{{ building.ticket_count }}</strong>
              </div>
              <div>
                <span>Completion</span>
                <strong>{{ formatPercent(building.completion_rate) }}</strong>
              </div>
              <div>
                <span>Verification</span>
                <strong>{{ formatPercent(building.verification_rate) }}</strong>
              </div>
              <div>
                <span>Overdue</span>
                <strong>{{ building.overdue_count }}</strong>
              </div>
            </div>

            <div class="badge-list">
              <Tag
                v-for="badge in building.active_badges.slice(0, 3)"
                :key="`${building.building_id}-${badge.badge_code}`"
                :value="badge.badge_label"
                severity="warning"
                rounded
              />
              <small v-if="building.active_badges.length > 3">+{{ building.active_badges.length - 3 }} more</small>
              <small v-if="!building.active_badges.length" class="muted">No active badges</small>
            </div>

            <div class="building-card__footer">
              <small>Updated {{ formatDateTime(building.calculated_at) }}</small>
              <Button
                label="Open Details"
                icon="pi pi-arrow-right"
                severity="info"
                text
                @click="openBuilding(building.building_id)"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  confidenceLabel,
  filterAndSortBuildings,
  formatDateTime,
  formatPercent,
  reliabilityLabel,
  useBuildingTrust
} from '~/composables/useBuildingTrust'
import type { BuildingListingItem, BuildingScoreBand, BuildingSortKey } from '~/types/buildingTrust'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'
import BuildingScoreRing from '~/components/buildings/ScoreRing.vue'
import BuildingTrendPill from '~/components/buildings/TrendPill.vue'
import BuildingReliabilityTag from '~/components/buildings/ReliabilityTag.vue'

const loading = ref(false)
const errorMessage = ref('')
const items = ref<BuildingListingItem[]>([])
const searchTerm = ref('')
const sortKey = ref<BuildingSortKey>('highest_score')
const scoreBand = ref<BuildingScoreBand>('all')
const hasBadgesOnly = ref(false)
const lowConfidenceOnly = ref(false)
const role = ref('')
const userId = ref('')
const token = ref('')

const route = useRoute()
const router = useRouter()
const { fetchBuildingListing } = useBuildingTrust()

const sortOptions = [
  { label: 'Highest Score', value: 'highest_score' },
  { label: 'Lowest Score', value: 'lowest_score' },
  { label: 'Most Improved', value: 'most_improved' },
  { label: 'Highest Ticket Count', value: 'highest_ticket_count' },
  { label: 'Lowest Overdue Rate', value: 'lowest_overdue_rate' }
]

const scoreBands = [
  { label: 'All Scores', value: 'all' },
  { label: '80+ Excellent', value: 'excellent' },
  { label: '60-79 Strong', value: 'strong' },
  { label: 'Below 60 Needs Attention', value: 'fair_or_low' }
]

const filteredItems = computed(() =>
  filterAndSortBuildings(items.value, {
    searchTerm: searchTerm.value,
    sortKey: sortKey.value,
    scoreBand: scoreBand.value,
    hasBadgesOnly: hasBadgesOnly.value,
    lowConfidenceOnly: lowConfidenceOnly.value
  })
)

const averageScore = computed(() => {
  if (!filteredItems.value.length) {
    return '--'
  }

  const total = filteredItems.value.reduce((sum, item) => sum + item.transparency_score, 0)
  return (total / filteredItems.value.length).toFixed(1)
})

const syncQueryState = () => {
  const query: Record<string, string> = {}
  if (searchTerm.value.trim()) {
    query.search = searchTerm.value.trim()
  }
  if (sortKey.value !== 'highest_score') {
    query.sort = sortKey.value
  }
  if (scoreBand.value !== 'all') {
    query.band = scoreBand.value
  }
  if (hasBadgesOnly.value) {
    query.badges = '1'
  }
  if (lowConfidenceOnly.value) {
    query.lowConfidence = '1'
  }

  router.replace({ query })
}

const hydrateQueryState = () => {
  const sort = String(route.query.sort || '')
  const band = String(route.query.band || '')

  searchTerm.value = String(route.query.search || '')
  if (sortOptions.some((item) => item.value === sort)) {
    sortKey.value = sort as BuildingSortKey
  }
  if (scoreBands.some((item) => item.value === band)) {
    scoreBand.value = band as BuildingScoreBand
  }
  hasBadgesOnly.value = route.query.badges === '1'
  lowConfidenceOnly.value = route.query.lowConfidence === '1'
}

watch([searchTerm, sortKey, scoreBand, hasBadgesOnly, lowConfidenceOnly], syncQueryState)

const copyBuildingId = async (buildingId: string) => {
  if (!process.client || !buildingId) {
    return
  }

  try {
    await navigator.clipboard.writeText(buildingId)
  } catch {
    // Clipboard availability is browser-dependent; no UI interruption needed.
  }
}

const openBuilding = (buildingId: string) => {
  if (buildingId) {
    router.push(`/buildings/${encodeURIComponent(buildingId)}`)
  }
}

const loadBuildings = async () => {
  if (!token.value) {
    errorMessage.value = 'You are not signed in.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const landlordUserId = role.value === 'LANDLORD' ? userId.value : undefined
  const result = await fetchBuildingListing(token.value, { landlordUserId })
  items.value = result.data
  errorMessage.value = result.error || ''
  loading.value = false
}

onMounted(async () => {
  if (!process.client) {
    return
  }

  hydrateQueryState()
  token.value = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
  userId.value = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''

  await loadBuildings()
})
</script>

<style scoped>
.buildings-page {
  min-height: 100vh;
  padding: 2.2rem 1rem 3rem;
  background: var(--color-soft-linen-300);
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1240px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.buildings-hero :deep(.p-card-body) {
  border-radius: 1.2rem;
  background: var(--color-carbon-black-900);
  color: var(--color-soft-linen-50);
  padding: 1.5rem;
}

.buildings-hero__layout {
  display: flex;
  justify-content: space-between;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.buildings-hero h1 {
  margin: 0.5rem 0 0.4rem;
  font-size: clamp(1.7rem, 3vw, 2.1rem);
}

.buildings-hero p {
  margin: 0;
  max-width: 720px;
  color: rgba(243, 244, 241, 0.9);
}

.buildings-hero__meta {
  display: flex;
  gap: 0.7rem;
}

.meta-box {
  min-width: 130px;
  padding: 0.8rem;
  border-radius: 0.8rem;
  background: rgba(243, 244, 241, 0.08);
}

.meta-box span {
  font-size: 0.76rem;
  color: rgba(243, 244, 241, 0.74);
}

.meta-box strong {
  display: block;
  margin-top: 0.3rem;
  font-size: 1.2rem;
}

.toolbar-card :deep(.p-card-body) {
  border-radius: 1rem;
  padding: 1rem;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.toolbar-toggles {
  display: flex;
  gap: 0.45rem;
}

.building-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.building-card :deep(.p-card-body) {
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-soft-linen-200);
}

.building-card__head {
  display: flex;
  gap: 0.85rem;
}

.building-card__identity h3 {
  margin: 0;
  font-size: 1.06rem;
  color: var(--color-carbon-black-800);
}

.identity-row {
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.identity-row code {
  font-size: 0.8rem;
  background: var(--color-soft-linen-100);
  border: 1px solid var(--color-soft-linen-200);
  padding: 0.15rem 0.4rem;
  border-radius: 0.4rem;
}

.identity-tags {
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.building-stats {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-soft-linen-200);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.building-stats span {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-carbon-black-500);
}

.building-stats strong {
  font-size: 1rem;
  color: var(--color-carbon-black-800);
}

.badge-list {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.badge-list small {
  color: var(--color-carbon-black-500);
}

.badge-list .muted {
  font-style: italic;
}

.building-card__footer {
  margin-top: 0.8rem;
  padding-top: 0.55rem;
  border-top: 1px dashed var(--color-soft-linen-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.building-card__footer small {
  color: var(--color-carbon-black-600);
}

@media (max-width: 980px) {
  .toolbar-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-toggles {
    flex-wrap: wrap;
  }
}
</style>
