<template>
  <main class="building-detail-page">
    <Toast position="top-right" />
    <div class="page-shell">
      <div class="detail-breadcrumb">
        <Button label="Buildings" icon="pi pi-arrow-left" text severity="secondary" @click="router.push('/buildings')" />
      </div>

      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
      <Message v-else-if="permissionsError" severity="warn" :closable="false">{{ permissionsError }}</Message>

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
                <p class="building-id">
                  <span>{{ metrics.building_id }}</span>
                  <Button
                    v-if="permissions.canCopyBuildingId"
                    icon="pi pi-copy"
                    text
                    severity="secondary"
                    rounded
                    size="small"
                    :loading="copyBuildingIdLoading"
                    :disabled="copyBuildingIdLoading"
                    aria-label="Copy Building ID"
                    @click="copyBuildingId"
                  />
                </p>
                <p class="summary-text">{{ summaryMessage }}</p>
              </div>
              <div class="hero-right">
                <BuildingScoreRing :score="metrics.transparency_score" />
                <div class="hero-right__meta">
                  <Tag :value="confidenceLabel(metrics.confidence_score)" severity="contrast" rounded />
                  <BuildingTrendPill :trend="metrics.trend_vs_previous" />
                  <BuildingReliabilityTag :label="reliabilityState" />
                </div>
                <button
                  v-if="permissions.canViewHistory"
                  type="button"
                  class="calculated-link"
                  @click="scrollToHistory"
                >
                  Calculated {{ formatDateTime(metrics.calculated_at) }}
                </button>
                <small v-else>Calculated {{ formatDateTime(metrics.calculated_at) }}</small>
              </div>
            </div>
          </template>
        </Card>

        <Card class="section-card actions-card">
          <template #title>Actions</template>
          <template #content>
            <div class="actions-card__layout">
              <div class="actions-card__buttons">
                <Button
                  v-if="permissions.canRefreshScore"
                  label="Refresh Score"
                  icon="pi pi-refresh"
                  severity="info"
                  :loading="refreshScoreLoading"
                  :disabled="refreshScoreLoading || refreshBadgesLoading"
                  @click="handleRefreshScore"
                />
                <Button
                  v-if="permissions.canRefreshBadges"
                  label="Refresh Badges"
                  icon="pi pi-star"
                  severity="warning"
                  :loading="refreshBadgesLoading"
                  :disabled="refreshBadgesLoading || refreshScoreLoading"
                  @click="handleRefreshBadges"
                />
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
          <template #title>Score Breakdown</template>
          <template #content>
            <div class="breakdown-subsection">
              <h4>Key Metrics</h4>
              <div class="metrics-grid metrics-grid--compact">
                <div class="metric-box">
                  <span>Total Tickets</span>
                  <strong>{{ metrics.ticket_count }}</strong>
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
                  <span>Overdue Tickets</span>
                  <strong>{{ metrics.overdue_count }}</strong>
                </div>
              </div>
            </div>

            <div class="breakdown-subsection">
              <h4>Performance Timing</h4>
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
            </div>

            <div class="score-derived-summary">
              <div class="derived-pill">
                <span>Final Transparency Score</span>
                <strong>{{ metrics.transparency_score.toFixed(1) }}</strong>
              </div>
              <div class="derived-pill derived-pill--soft">
                <span>Positive Signal Avg</span>
                <strong>{{ positiveSignalAverage }}</strong>
              </div>
              <div class="derived-pill derived-pill--soft">
                <span>Total Penalties</span>
                <strong>{{ totalPenaltyDisplay }}</strong>
              </div>
              <div class="derived-pill derived-pill--soft">
                <span>Confidence</span>
                <strong>{{ confidenceLabel(metrics.confidence_score) }}</strong>
              </div>
            </div>

            <div v-if="!showBreakdownDetails" class="breakdown-toggle">
              <Button
                label="See More Details"
                icon="pi pi-angle-down"
                iconPos="right"
                text
                severity="secondary"
                @click="showBreakdownDetails = true"
              />
            </div>

            <div v-if="showBreakdownDetails" class="breakdown-expanded">
              <div class="breakdown-subsection">
                <h4>More Metrics</h4>
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
              </div>

              <div class="breakdown-list">
                <div
                  v-for="item in scoreBreakdown"
                  :key="item.key"
                  class="breakdown-item"
                  :title="item.explanation"
                  tabindex="0"
                >
                  <div class="breakdown-item__head">
                    <span>{{ item.label }} <small>({{ item.source }})</small></span>
                    <strong>{{ item.displayValue }}</strong>
                  </div>
                  <ProgressBar :value="item.progress" :showValue="false" />
                </div>
              </div>
              <Message v-if="limitedBreakdownData" severity="info" :closable="false">
                Some timing-based score components are hidden because this building has limited confidence/data volume.
              </Message>
              <Message severity="secondary" :closable="false">
                Penalties are deducted from the total when reopening and overdue rates increase.
              </Message>
            </div>
            <div v-if="showBreakdownDetails" class="breakdown-toggle breakdown-toggle--bottom">
              <Button
                label="See Less"
                icon="pi pi-angle-up"
                iconPos="right"
                text
                severity="secondary"
                @click="showBreakdownDetails = false"
              />
            </div>
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

        <section id="score-history" ref="historySectionRef">
          <Card class="section-card">
            <template #title>Score History</template>
            <template #content>
              <div v-if="!history.length" class="section-empty">No score history recorded yet.</div>
              <ul v-else class="history-list">
                <li v-for="point in visibleHistory" :key="point.id">
                  <div>
                    <strong>{{ formatDateTime(point.calculated_at) }}</strong>
                    <small>{{ confidenceLabel(point.confidence_score) }}</small>
                  </div>
                  <Tag :value="point.transparency_score.toFixed(1)" severity="info" rounded />
                </li>
              </ul>
              <div v-if="hasMoreHistory" class="history-actions">
                <Button
                  :label="showAllHistory ? 'See Less' : 'See More'"
                  :icon="showAllHistory ? 'pi pi-angle-up' : 'pi pi-angle-down'"
                  iconPos="right"
                  text
                  severity="secondary"
                  @click="showAllHistory = !showAllHistory"
                />
              </div>
            </template>
          </Card>
        </section>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import {
  confidenceLabel,
  formatDateTime,
  formatMinutes,
  formatPercent,
  reliabilityLabel,
  useBuildingTrust
} from '~/composables/useBuildingTrust'
import { useBuildingTrustPermissions } from '~/composables/useBuildingTrustPermissions'
import type { BuildingScoreHistoryPoint, BuildingTransparencyMetrics, BuildingTrustBadge } from '~/types/buildingTrust'
import { SUPABASE_ACCESS_TOKEN_KEY } from '~/composables/useSupabaseAuth'
import BuildingScoreRing from '~/components/buildings/ScoreRing.vue'
import BuildingTrendPill from '~/components/buildings/TrendPill.vue'
import BuildingReliabilityTag from '~/components/buildings/ReliabilityTag.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchBuildingScoreHistory, fetchBuildingTrustProfile, refreshBuildingTransparencyScore, refreshBuildingTrustBadges } =
  useBuildingTrust()
const { permissions, errorMessage: permissionsError, resolvePermissions } = useBuildingTrustPermissions()

const loading = ref(false)
const errorMessage = ref('')
const metrics = ref<BuildingTransparencyMetrics | null>(null)
const badges = ref<BuildingTrustBadge[]>([])
const history = ref<BuildingScoreHistoryPoint[]>([])
const refreshScoreLoading = ref(false)
const refreshBadgesLoading = ref(false)
const copyBuildingIdLoading = ref(false)
const historySectionRef = ref<HTMLElement | null>(null)
const showAllHistory = ref(false)
const showBreakdownDetails = ref(false)

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
    {
      key: 'view_score',
      label: 'View Score',
      source: 'Avg First View Time',
      explanation: 'Faster first-view times increase this score.',
      value: metrics.value.view_score,
      invert: false
    },
    {
      key: 'response_score',
      label: 'Response Score',
      source: 'Avg First Response Time',
      explanation: 'Faster first-response times increase this score.',
      value: metrics.value.response_score,
      invert: false
    },
    {
      key: 'resolution_score',
      label: 'Resolution Score',
      source: 'Avg Resolution Time',
      explanation: 'Faster issue resolution increases this score.',
      value: metrics.value.resolution_score,
      invert: false
    },
    {
      key: 'completion_score',
      label: 'Completion Score',
      source: 'Completion Rate',
      explanation: 'More completed tickets increase this score.',
      value: metrics.value.completion_score,
      invert: false
    },
    {
      key: 'verification_score',
      label: 'Verification Score',
      source: 'Verification Rate',
      explanation: 'More tenant-verified outcomes increase this score.',
      value: metrics.value.verification_score,
      invert: false
    },
    {
      key: 'reopened_penalty',
      label: 'Reopened Penalty',
      source: 'Reopened Rate',
      explanation: 'Higher reopen rates deduct from the final score.',
      value: metrics.value.reopened_penalty,
      invert: true
    },
    {
      key: 'overdue_penalty',
      label: 'Overdue Penalty',
      source: 'Overdue Rate',
      explanation: 'Higher overdue rates deduct from the final score.',
      value: metrics.value.overdue_penalty,
      invert: true
    }
  ]

  return rows.map((row) => {
    const shouldHideForLimitedData =
      !row.invert &&
      ['View Score', 'Response Score', 'Resolution Score'].includes(row.label) &&
      Number(row.value ?? 0) === 0 &&
      limitedBreakdownData.value

    return {
      key: row.key,
      label: row.label,
      source: row.source,
      explanation: row.explanation,
      invert: row.invert,
      value: row.value,
      hiddenForLimitedData: shouldHideForLimitedData,
      numericValue: row.value == null ? null : Number(row.value),
      displayValue: (() => {
      if (row.value == null) {
        return '--'
      }

      if (shouldHideForLimitedData) {
        return '--'
      }

      const numeric = Number(row.value)
      if (row.invert) {
        return numeric === 0 ? '0.0' : `-${numeric.toFixed(1)}`
      }

      return numeric.toFixed(1)
      })(),
      progress: (() => {
      if (row.value == null) {
        return 0
      }

      if (shouldHideForLimitedData) {
        return 0
      }

      const numeric = Number(row.value)
        const scaled = row.invert ? Math.abs(numeric) : numeric
        return Math.max(0, Math.min(100, scaled))
      })()
    }
  })
})

const limitedBreakdownData = computed(() => {
  if (!metrics.value) {
    return false
  }

  return metrics.value.ticket_count < 3 || metrics.value.confidence_score < 50
})

const positiveScoreItems = computed(() =>
  scoreBreakdown.value.filter((item) => !item.invert && !item.hiddenForLimitedData && item.numericValue != null)
)

const penaltyScoreItems = computed(() =>
  scoreBreakdown.value.filter((item) => item.invert && item.numericValue != null)
)

const positiveSignalAverage = computed(() => {
  if (!positiveScoreItems.value.length) {
    return '--'
  }

  const total = positiveScoreItems.value.reduce((sum, item) => sum + Number(item.numericValue || 0), 0)
  return (total / positiveScoreItems.value.length).toFixed(1)
})

const totalPenaltyDisplay = computed(() => {
  if (!penaltyScoreItems.value.length) {
    return '0.0'
  }

  const total = penaltyScoreItems.value.reduce((sum, item) => sum + Math.max(0, Number(item.numericValue || 0)), 0)
  return total.toFixed(1)
})

const sortedHistory = computed(() =>
  [...history.value].sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())
)

const hasMoreHistory = computed(() => sortedHistory.value.length > 2)

const visibleHistory = computed(() => (showAllHistory.value ? sortedHistory.value : sortedHistory.value.slice(0, 2)))

const getAccessToken = () => (process.client ? localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || '' : '')

const loadDetail = async (showLoadingState = true) => {
  if (!process.client) {
    return
  }

  const token = getAccessToken()
  if (!token) {
    errorMessage.value = 'You are not signed in.'
    return
  }

  if (showLoadingState) {
    loading.value = true
  }

  errorMessage.value = ''

  const [profileResult, historyResult] = await Promise.all([
    fetchBuildingTrustProfile(token, buildingId.value),
    fetchBuildingScoreHistory(token, buildingId.value)
  ])

  metrics.value = profileResult.data?.metrics || null
  badges.value = profileResult.data?.badges || []
  history.value = historyResult.data || []
  showAllHistory.value = false
  showBreakdownDetails.value = false
  errorMessage.value = profileResult.error || historyResult.error || (metrics.value ? '' : 'Building profile not found.')
  if (showLoadingState) {
    loading.value = false
  }
}

const scrollToHistory = () => {
  historySectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const copyBuildingId = async () => {
  if (!buildingId.value) {
    toast.add({ severity: 'warn', summary: 'Missing Building ID', detail: 'No building id was found.', life: 2600 })
    return
  }

  if (!process.client) {
    return
  }

  copyBuildingIdLoading.value = true
  try {
    await navigator.clipboard.writeText(buildingId.value)
    toast.add({ severity: 'success', summary: 'Copied', detail: 'Building id copied to clipboard.', life: 2200 })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Copy Failed',
      detail: 'Unable to copy building id in this browser session.',
      life: 2600
    })
  } finally {
    copyBuildingIdLoading.value = false
  }
}

const handleRefreshScore = async () => {
  if (!permissions.value.canRefreshScore) {
    toast.add({
      severity: 'warn',
      summary: 'Not Authorized',
      detail: 'Only the owning landlord can refresh this building score.',
      life: 2600
    })
    return
  }

  const token = getAccessToken()
  if (!token) {
    toast.add({ severity: 'error', summary: 'Not Signed In', detail: 'Please sign in and try again.', life: 2600 })
    return
  }

  refreshScoreLoading.value = true
  const result = await refreshBuildingTransparencyScore(token, buildingId.value, 30)
  if (result.error) {
    toast.add({ severity: 'error', summary: 'Refresh Failed', detail: result.error, life: 3200 })
    refreshScoreLoading.value = false
    return
  }

  await loadDetail(false)
  toast.add({ severity: 'success', summary: 'Score Refreshed', detail: 'Building score and trust profile updated.', life: 2400 })
  refreshScoreLoading.value = false
}

const handleRefreshBadges = async () => {
  if (!permissions.value.canRefreshBadges) {
    toast.add({
      severity: 'warn',
      summary: 'Not Authorized',
      detail: 'Only the owning landlord can refresh trust badges for this building.',
      life: 2600
    })
    return
  }

  const token = getAccessToken()
  if (!token) {
    toast.add({ severity: 'error', summary: 'Not Signed In', detail: 'Please sign in and try again.', life: 2600 })
    return
  }

  refreshBadgesLoading.value = true
  const result = await refreshBuildingTrustBadges(token, buildingId.value)
  if (result.error) {
    toast.add({ severity: 'error', summary: 'Refresh Failed', detail: result.error, life: 3200 })
    refreshBadgesLoading.value = false
    return
  }

  await loadDetail(false)
  toast.add({ severity: 'success', summary: 'Badges Refreshed', detail: 'Active trust badges were updated.', life: 2400 })
  refreshBadgesLoading.value = false
}

onMounted(async () => {
  await Promise.all([resolvePermissions(buildingId.value), loadDetail()])
})

watch(
  () => buildingId.value,
  async (next, previous) => {
    if (!next || next === previous) {
      return
    }

    await Promise.all([resolvePermissions(next), loadDetail()])
  }
)
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
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
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

.calculated-link {
  border: 0;
  background: transparent;
  color: rgba(243, 244, 241, 0.75);
  font-size: 0.8rem;
  text-decoration: underline;
  text-underline-offset: 0.12rem;
  cursor: pointer;
  padding: 0;
}

.section-card :deep(.p-card-body) {
  border-radius: 1rem;
  padding: 1.1rem;
}

.actions-card__layout {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.actions-card__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.actions-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
  text-align: right;
}

.actions-card__meta small {
  color: var(--color-carbon-black-600);
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

.metrics-grid--compact {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.breakdown-subsection {
  margin-bottom: 0.8rem;
}

.breakdown-subsection h4 {
  margin: 0 0 0.45rem;
  color: var(--color-carbon-black-800);
  font-size: 0.95rem;
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

.score-derived-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.8rem;
}

.breakdown-toggle {
  display: flex;
  justify-content: center;
  margin: 0.1rem 0 0.55rem;
}

.breakdown-expanded {
  border-top: 1px solid var(--color-soft-linen-200);
  padding-top: 0.7rem;
}

.breakdown-toggle--bottom {
  margin: 0.45rem 0 0;
}

.derived-pill {
  border: 1px solid var(--color-soft-linen-200);
  background: #fff;
  border-radius: 0.7rem;
  padding: 0.55rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.derived-pill--soft {
  background: var(--color-soft-linen-50);
}

.derived-pill span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-carbon-black-600);
}

.derived-pill strong {
  font-size: 1.05rem;
  color: var(--color-carbon-black-800);
}

.breakdown-item__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.25rem;
  color: var(--color-carbon-black-700);
}

.breakdown-item__head small {
  color: var(--color-carbon-black-500);
  font-size: 0.72rem;
}

.breakdown-item {
  cursor: help;
}

.breakdown-item:focus-visible {
  outline: 2px solid var(--color-indigo-velvet-400);
  outline-offset: 4px;
  border-radius: 0.35rem;
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

.history-actions {
  margin-top: 0.35rem;
  display: flex;
  justify-content: center;
}

@media (max-width: 760px) {
  .hero-right {
    align-items: flex-start;
  }

  .hero-right__meta {
    justify-content: flex-start;
  }

  .actions-card__meta {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
