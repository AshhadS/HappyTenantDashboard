<template>
  <main class="building-detail-page">
    <div class="page-shell">
      <div class="detail-breadcrumb">
        <Button label="Buildings" icon="pi pi-arrow-left" text severity="secondary" @click="router.push('/buildings')" />
      </div>

      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

      <div v-else-if="loading" class="detail-loading">
        <Card v-for="index in 4" :key="`detail-skeleton-${index}`">
          <template #content>
            <Skeleton height="8rem" borderRadius="1rem" />
          </template>
        </Card>
      </div>

      <template v-else-if="metrics">
        <Card class="detail-hero">
          <template #content>
            <div class="detail-hero__layout">
              <div class="hero-left">
                <Tag value="Building Trust Profile" icon="pi pi-building" severity="warning" rounded />
                <h1>{{ metrics.building_name || 'Unnamed Building' }}</h1>
                <p class="building-id">{{ metrics.building_id }}</p>
                <p class="summary-text">{{ summaryMessage }}</p>
              </div>
              <div class="hero-right">
                <BuildingScoreRing :score="metrics.transparency_score" />
                <div class="hero-right__meta">
                  <Tag :value="confidenceLabel(metrics.confidence_score)" severity="contrast" rounded />
                  <BuildingTrendPill :trend="metrics.trend_vs_previous" />
                  <BuildingReliabilityTag :label="reliabilityState" />
                </div>
                <small>Calculated {{ formatDateTime(metrics.calculated_at) }}</small>
              </div>
            </div>
          </template>
        </Card>

        <Card class="section-card">
          <template #title>Trust Badges</template>
          <template #content>
            <div v-if="!badges.length" class="section-empty">No active trust badges for this building yet.</div>
            <div v-else class="badges-grid">
              <div v-for="badge in badges" :key="`${badge.badge_code}-${badge.earned_at}`" class="badge-card">
                <Tag :value="badge.badge_label" severity="warning" rounded />
                <p>{{ badge.badge_reason || 'Badge earned based on current trust performance.' }}</p>
                <small>Earned {{ formatDateTime(badge.earned_at) }}</small>
              </div>
            </div>
          </template>
        </Card>

        <Card class="section-card">
          <template #title>Key Metrics</template>
          <template #content>
            <div class="metrics-grid">
              <div class="metric-box">
                <span>Total Tickets</span>
                <strong>{{ metrics.ticket_count }}</strong>
              </div>
              <div class="metric-box">
                <span>Completed Tickets</span>
                <strong>{{ metrics.completed_count }}</strong>
              </div>
              <div class="metric-box">
                <span>Verified Tickets</span>
                <strong>{{ metrics.verified_count }}</strong>
              </div>
              <div class="metric-box">
                <span>Reopened Tickets</span>
                <strong>{{ metrics.reopened_count }}</strong>
              </div>
              <div class="metric-box">
                <span>Overdue Tickets</span>
                <strong>{{ metrics.overdue_count }}</strong>
              </div>
              <div class="metric-box">
                <span>Completion Rate</span>
                <strong>{{ formatPercent(metrics.completion_rate) }}</strong>
              </div>
              <div class="metric-box">
                <span>Verification Rate</span>
                <strong>{{ formatPercent(metrics.verification_rate) }}</strong>
              </div>
              <div class="metric-box">
                <span>Reopened Rate</span>
                <strong>{{ formatPercent(metrics.reopened_rate) }}</strong>
              </div>
              <div class="metric-box">
                <span>Overdue Rate</span>
                <strong>{{ formatPercent(metrics.overdue_rate) }}</strong>
              </div>
            </div>
          </template>
        </Card>

        <Card class="section-card">
          <template #title>Performance Timing</template>
          <template #content>
            <div class="timing-grid">
              <div class="metric-box">
                <span>Average First View</span>
                <strong>{{ formatMinutes(metrics.avg_first_view_minutes) }}</strong>
              </div>
              <div class="metric-box">
                <span>Average First Response</span>
                <strong>{{ formatMinutes(metrics.avg_first_response_minutes) }}</strong>
              </div>
              <div class="metric-box">
                <span>Average Resolution</span>
                <strong>{{ formatMinutes(metrics.avg_resolution_minutes) }}</strong>
              </div>
            </div>
          </template>
        </Card>

        <Card class="section-card">
          <template #title>Score Breakdown</template>
          <template #content>
            <div class="breakdown-list">
              <div v-for="item in scoreBreakdown" :key="item.label" class="breakdown-item">
                <div class="breakdown-item__head">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value.toFixed(1) }}</strong>
                </div>
                <ProgressBar :value="item.progress" :showValue="false" />
              </div>
            </div>
            <Message severity="secondary" :closable="false">
              Penalties are deducted from the total when reopening and overdue rates increase.
            </Message>
          </template>
        </Card>

        <Card class="section-card">
          <template #title>Reliability Interpretation</template>
          <template #content>
            <div class="reliability-panel">
              <BuildingReliabilityTag :label="reliabilityState" />
              <p>{{ reliabilityMessage }}</p>
            </div>
          </template>
        </Card>

        <Card class="section-card">
          <template #title>Score History</template>
          <template #content>
            <div v-if="!history.length" class="section-empty">No score history recorded yet.</div>
            <ul v-else class="history-list">
              <li v-for="point in history" :key="point.id">
                <div>
                  <strong>{{ formatDateTime(point.calculated_at) }}</strong>
                  <small>{{ confidenceLabel(point.confidence_score) }}</small>
                </div>
                <Tag :value="point.transparency_score.toFixed(1)" severity="info" rounded />
              </li>
            </ul>
          </template>
        </Card>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  confidenceLabel,
  formatDateTime,
  formatMinutes,
  formatPercent,
  reliabilityLabel,
  useBuildingTrust
} from '~/composables/useBuildingTrust'
import type { BuildingScoreHistoryPoint, BuildingTransparencyMetrics, BuildingTrustBadge } from '~/types/buildingTrust'
import { SUPABASE_ACCESS_TOKEN_KEY } from '~/composables/useSupabaseAuth'
import BuildingScoreRing from '~/components/buildings/ScoreRing.vue'
import BuildingTrendPill from '~/components/buildings/TrendPill.vue'
import BuildingReliabilityTag from '~/components/buildings/ReliabilityTag.vue'

const route = useRoute()
const router = useRouter()
const { fetchBuildingScoreHistory, fetchBuildingTrustProfile } = useBuildingTrust()

const loading = ref(false)
const errorMessage = ref('')
const metrics = ref<BuildingTransparencyMetrics | null>(null)
const badges = ref<BuildingTrustBadge[]>([])
const history = ref<BuildingScoreHistoryPoint[]>([])

const buildingId = computed(() => String(route.params.buildingId || ''))
const reliabilityState = computed(() =>
  metrics.value ? reliabilityLabel(metrics.value.transparency_score, metrics.value.confidence_score, metrics.value.overdue_rate) : '--'
)

const summaryMessage = computed(() => {
  if (!metrics.value) {
    return ''
  }

  if (metrics.value.transparency_score >= 80 && metrics.value.overdue_rate < 15) {
    return 'This building is performing well with timely handling and steady maintenance follow-through.'
  }

  if (metrics.value.transparency_score >= 70) {
    return 'This building is stable and improving, with room to strengthen verification consistency.'
  }

  return 'This building needs improvement due to delayed resolution and lower trust consistency.'
})

const reliabilityMessage = computed(() => {
  if (!metrics.value) {
    return '--'
  }

  if (metrics.value.transparency_score >= 80 && metrics.value.confidence_score >= 80) {
    return 'High score and strong data confidence indicate dependable operations and healthy accountability.'
  }

  if (metrics.value.transparency_score >= 75 && metrics.value.confidence_score < 50) {
    return 'Performance looks promising, but confidence is limited due to low ticket volume.'
  }

  if (metrics.value.overdue_rate >= 20 || metrics.value.transparency_score < 50) {
    return 'Attention is required: overdue and quality signals suggest delayed issue handling.'
  }

  return 'The building is improving, with moderate confidence and visible progress in service reliability.'
})

const scoreBreakdown = computed(() => {
  if (!metrics.value) {
    return []
  }

  const rows = [
    { label: 'View Score', value: metrics.value.view_score || 0, max: 20 },
    { label: 'Response Score', value: metrics.value.response_score || 0, max: 20 },
    { label: 'Resolution Score', value: metrics.value.resolution_score || 0, max: 20 },
    { label: 'Completion Score', value: metrics.value.completion_score || 0, max: 20 },
    { label: 'Verification Score', value: metrics.value.verification_score || 0, max: 20 },
    { label: 'Reopened Penalty', value: -(metrics.value.reopened_penalty || 0), max: 20 },
    { label: 'Overdue Penalty', value: -(metrics.value.overdue_penalty || 0), max: 20 }
  ]

  return rows.map((row) => ({
    ...row,
    progress: Math.max(0, Math.min(100, ((row.value + row.max) / (row.max * 2)) * 100))
  }))
})

const loadDetail = async () => {
  if (!process.client) {
    return
  }

  const token = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  if (!token) {
    errorMessage.value = 'You are not signed in.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const [profileResult, historyResult] = await Promise.all([
    fetchBuildingTrustProfile(token, buildingId.value),
    fetchBuildingScoreHistory(token, buildingId.value)
  ])

  metrics.value = profileResult.data?.metrics || null
  badges.value = profileResult.data?.badges || []
  history.value = historyResult.data || []
  errorMessage.value = profileResult.error || historyResult.error || (metrics.value ? '' : 'Building profile not found.')
  loading.value = false
}

onMounted(loadDetail)
</script>

<style scoped>
.building-detail-page {
  min-height: 100vh;
  padding: 2.2rem 1rem 3rem;
  background: var(--color-soft-linen-300);
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1080px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-breadcrumb {
  display: flex;
  justify-content: flex-start;
}

.detail-loading {
  display: grid;
  gap: 1rem;
}

.detail-hero :deep(.p-card-body) {
  border-radius: 1.2rem;
  background: var(--color-carbon-black-900);
  color: var(--color-soft-linen-50);
  padding: 1.4rem;
}

.detail-hero__layout {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.hero-left h1 {
  margin: 0.45rem 0 0.2rem;
}

.building-id {
  font-size: 0.85rem;
  color: rgba(243, 244, 241, 0.72);
  margin: 0;
}

.summary-text {
  margin: 0.7rem 0 0;
  max-width: 760px;
}

.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.hero-right__meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hero-right small {
  color: rgba(243, 244, 241, 0.75);
}

.section-card :deep(.p-card-body) {
  border-radius: 1rem;
  padding: 1.1rem;
}

.section-empty {
  color: var(--color-carbon-black-600);
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.8rem;
}

.badge-card {
  border: 1px solid var(--color-soft-linen-200);
  border-radius: 0.8rem;
  padding: 0.8rem;
  background: #fff;
}

.badge-card p {
  margin: 0.55rem 0;
  color: var(--color-carbon-black-700);
  font-size: 0.9rem;
}

.badge-card small {
  color: var(--color-carbon-black-500);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0.6rem;
}

.timing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
}

.metric-box {
  border: 1px solid var(--color-soft-linen-200);
  border-radius: 0.8rem;
  background: #fff;
  padding: 0.72rem;
}

.metric-box span {
  display: block;
  font-size: 0.75rem;
  color: var(--color-carbon-black-500);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.metric-box strong {
  font-size: 1.22rem;
  color: var(--color-carbon-black-800);
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.breakdown-item__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  color: var(--color-carbon-black-700);
}

.reliability-panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.reliability-panel p {
  margin: 0;
  color: var(--color-carbon-black-700);
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.history-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid var(--color-soft-linen-200);
  border-radius: 0.7rem;
  padding: 0.6rem 0.75rem;
  background: #fff;
}

.history-list strong {
  display: block;
  color: var(--color-carbon-black-800);
}

.history-list small {
  color: var(--color-carbon-black-500);
}

@media (max-width: 760px) {
  .hero-right {
    align-items: flex-start;
  }

  .hero-right__meta {
    justify-content: flex-start;
  }
}
</style>
