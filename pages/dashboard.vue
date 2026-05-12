<template>
  <main class="dashboard-page">
    <div class="page-shell">
      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
      <Message v-else-if="!['authenticated', 'LANDLORD', 'WATCHMAN'].includes(role)" severity="warn" :closable="false">
        You are signed in as <strong>{{ role || 'user' }}</strong>. Dashboard cards are available for super admins only.
      </Message>

      <section v-else class="dashboard-content">
        <Card class="hero-card">
          <template #content>
            <div class="hero-card__layout">
              <div class="hero-card__copy">
                <div class="hero-card__header">
                  <div>
                    <Tag :value="`Live `" icon="pi pi-bolt mr-1" severity="warning" rounded />
                    &nbsp;
                    <Tag :value="`${role  }`" icon="pi pi-user" severity="warning" rounded />

                  </div>
                  <div class="hero-card__headline">
                    <h1>Admin Dashboard</h1>
                  </div>

                  <div class="hero-card__actions">
                    <Button
                      v-for="action in quickActions"
                      :key="action.label"
                      :label="action.label"
                      :icon="action.icon"
                      :severity="action.severity"
                      rounded
                      size="small"
                    />
                  </div>
                </div>
              </div>


              <div v-if="role === 'LANDLORD'" class="hero-card__transparency">
                <div class="transparency-header">
                  <div>
                    <span>Landlord Transparency</span>
                    <p>Live accountability across buildings</p>
                  </div>
                  <Tag value="Insight" severity="success" style="color: green;" rounded />
                </div>

                <div v-if="landlordMetricsLoading" class="transparency-mini-loading">
                  <Skeleton v-for="index in 3" :key="`landlord-mini-${index}`" height="56px" borderRadius="0.8rem" />
                </div>
                <Message v-else-if="landlordMetricsError" severity="warn" :closable="false">
                  {{ landlordMetricsError }}
                </Message>
                <Message v-else-if="!landlordSummary.total" severity="info" :closable="false">
                  No landlord activity yet. Ticket insights will appear once complaints are recorded.
                </Message>
                <template v-else>
                  <div class="transparency-pill-grid">
                    <div class="pill accent-gold">
                      <span>Total complaints</span>
                      <strong>{{ landlordSummary.total }}</strong>
                    </div>
                    <div class="pill accent-rose">
                      <span>Open items</span>
                      <strong>{{ landlordSummary.open }}</strong>
                    </div>
                    <div class="pill accent-teal">
                      <span>Resolved</span>
                      <strong>{{ landlordSummary.completed }}</strong>
                    </div>
                    <div class="pill accent-indigo">
                      <span>Avg resolution</span>
                      <strong>{{ formatHours(landlordSummary.avgResolutionHours) }}</strong>
                    </div>
                  </div>

                  <div class="transparency-mini-grid">
                    <div class="mini-panel">
                      <div class="mini-panel__header">
                        <h4>Top Watchmen</h4>
                        <small>Completion & speed</small>
                      </div>
                      <ul>
                        <li v-for="watchman in landlordWatchmen" :key="watchman.name">
                          <div>
                            <strong>{{ watchman.name }}</strong>
                            <small>{{ watchman.total }} tickets · {{ formatRate(watchman.completionRate) }}</small>
                          </div>
                          <Tag :value="formatHours(watchman.avgResolutionHours)" severity="secondary" rounded />
                        </li>
                      </ul>
                    </div>

                    <div class="mini-panel">
                      <div class="mini-panel__header">
                        <h4>Building Load</h4>
                        <small>Open vs total</small>
                      </div>
                      <ul>
                        <li v-for="building in landlordBuildings" :key="building.name">
                          <div>
                            <strong>{{ building.name }}</strong>
                            <small>{{ building.total }} total</small>
                          </div>
                          <Tag :value="`${building.open} open`" severity="warning" rounded />
                        </li>
                      </ul>
                    </div>

                    <div class="mini-panel mini-panel--wide">
                      <div class="mini-panel__header">
                        <h4>Escalated Issues</h4>
                        <Button
                          v-if="hasEscalationOverflow"
                          size="small"
                          text
                          label="See all"
                          severity="danger"
                          @click="openEscalatedModal"
                        />
                      </div>
                      <p v-if="!topEscalatedIssues.length" class="empty-escalation-text">
                        No escalations in progress.
                      </p>
                      <ul v-else class="escalation-list">
                        <li v-for="issue in topEscalatedIssues" :key="issue.support_ticket_id">
                          <div>
                            <strong>{{ issue.title || 'Escalated ticket' }}</strong>
                            <small>{{ issue.tenant_name || 'Unknown tenant' }} · {{ issue.building_name || 'Unassigned' }}</small>
                          </div>
                          <div class="escalation-meta">
                            <span>{{ formatTimelineDate(issue.created_at) }}</span>
                            <Tag value="Escalated" severity="danger" rounded />
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </Card>

        <Dialog
          v-if="role === 'LANDLORD'"
          v-model:visible="escalatedModalVisible"
          modal
          :header="escalatedModalTitle"
          class="escalation-dialog"
          :style="{ width: 'min(640px, 95vw)' }"
        >
          <div v-if="!landlordEscalated.length" class="empty-escalation-text">
            No escalations available.
          </div>
          <ul v-else class="escalation-list modal">
            <li v-for="issue in landlordEscalated" :key="issue.support_ticket_id">
              <div>
                <strong>{{ issue.title || 'Escalated ticket' }}</strong>
                <small>
                  {{ issue.tenant_name || 'Unknown tenant' }}
                  · {{ issue.building_name || 'Unassigned' }}
                  <span v-if="issue.unit_number">· Unit {{ issue.unit_number }}</span>
                </small>
                <p v-if="issue.description">{{ issue.description }}</p>
              </div>
              <div class="escalation-meta">
                <span>{{ formatTimelineDate(issue.created_at) }}</span>
                <Tag value="Escalated" severity="danger" rounded />
              </div>
            </li>
          </ul>
        </Dialog>

        <div class="stats-grid">
          <Card
            v-for="stat in statCards"
            :key="stat.title"
            :class="['stat-card', stat.accent, 'stat-card--interactive']"
            role="button"
            tabindex="0"
            :aria-label="`View ${stat.title} list`"
            @click="handleStatClick(stat.key)"
            @keyup.enter.prevent="handleStatClick(stat.key)"
            @keyup.space.prevent="handleStatClick(stat.key)"
          >
            <template #title>
              <div class="stat-card__title">
                <i :class="['pi', stat.icon]"></i>
                <span>{{ stat.title }}</span>
              </div>
            </template>
            <template #content>
              <div class="stat-card__body">
                <div class="count">
                  <Skeleton v-if="loading" width="70px" height="2.5rem" />
                  <span v-else>{{ stat.value }}</span>
                </div>
                <Tag :value="stat.trend" :severity="stat.severity" rounded />
                <small>{{ stat.caption }}</small>
              </div>
            </template>
          </Card>
        </div>

        <Card v-if="role === 'LANDLORD'" class="iot-dashboard-card">
          <template #title>
            <div class="iot-dashboard-card__title">
              <span>IoT Monitoring</span>
              <Button label="Open" icon="pi pi-arrow-right" text severity="secondary" @click="router.push('/iot-monitoring')" />
            </div>
          </template>
          <template #content>
            <Message v-if="iotSummaryError" severity="warn" :closable="false">{{ iotSummaryError }}</Message>
            <div v-else class="iot-summary-grid">
              <div class="iot-summary-item">
                <span>Active Alerts</span>
                <strong>{{ iotSummary.activeSensorAlerts }}</strong>
              </div>
              <div class="iot-summary-item">
                <span>Total Sensors</span>
                <strong>{{ iotSummary.totalSensors }}</strong>
              </div>
              <div class="iot-summary-item">
                <span>Offline Sensors</span>
                <strong>{{ iotSummary.offlineSensors }}</strong>
              </div>
              <div class="iot-summary-item">
                <span>Auto-detected Tickets</span>
                <strong>{{ iotSummary.autoDetectedTickets }}</strong>
              </div>
              <div class="iot-summary-item">
                <span>Verified Repairs</span>
                <strong>{{ iotSummary.sensorVerifiedRepairs }}</strong>
              </div>
              <div class="iot-summary-item">
                <span>Open Incidents</span>
                <strong>{{ iotSummary.openIotIncidents }}</strong>
              </div>
            </div>
          </template>
        </Card>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'
import { useIotMaintenance } from '~/composables/useIotMaintenance'

type EntityKey = 'tenant' | 'watchman' | 'support_ticket'

interface SupportTicketRecord {
  id: string
  title: string
  status: string
  created_at: string
  updated_at?: string
}

interface SupportTicketEventRecord {
  ticket_id: string
  event_type: string
  created_at: string
  metadata?: Record<string, unknown> | string | null
}

interface ComplaintTimelineEvent {
  key: string
  label: string
  timestamp: string
  detail?: string
  variant: string
}

interface LandlordTicketRecord {
  support_ticket_id?: string
  title?: string
  status?: string
  description?: string
  tenant_name?: string
  building_name?: string
  unit_number?: string
  watchman_name?: string
  photo_url?: string
  escalated?: boolean
  created_at?: string
  updated_at?: string
}

interface LandlordWatchmanSummary {
  name: string
  total: number
  completionRate: number
  avgResolutionHours: number
}

interface LandlordBuildingSummary {
  name: string
  total: number
  open: number
}

const role = ref('')
const loading = ref(false)
const errorMessage = ref('')
const counts = reactive({
  tenant: 0,
  watchman: 0,
  support_tickets: 0
})
const runtimeConfig = useRuntimeConfig()
const supabaseUrl = runtimeConfig.public.supabaseUrl
const supabaseAnonKey = runtimeConfig.public.supabaseAnonKey
const supabaseToken = ref('')
const landlordUserId = ref('')
const landlordMetricsLoading = ref(false)
const landlordMetricsError = ref('')
const landlordSummary = reactive({
  total: 0,
  open: 0,
  completed: 0,
  avgResolutionHours: 0
})
const landlordWatchmen = ref<LandlordWatchmanSummary[]>([])
const landlordBuildings = ref<LandlordBuildingSummary[]>([])
const landlordEscalated = ref<LandlordTicketRecord[]>([])
const escalatedModalVisible = ref(false)
const iotSummaryError = ref('')
const iotSummary = reactive({
  activeSensorAlerts: 0,
  totalSensors: 0,
  offlineSensors: 0,
  autoDetectedTickets: 0,
  sensorVerifiedRepairs: 0,
  openIotIncidents: 0
})
const router = useRouter()
const { fetchOverview: fetchIotOverview } = useIotMaintenance()
const entityRoutes: Record<EntityKey, string> = {
  tenant: '/entities/tenants',
  watchman: '/entities/watchmen',
  support_ticket: '/tickets'
}

const occupancyGoal = 120
const watchmanGoal = 20
const ticketGoal = 40
const resolvedStatuses = ['COMPLETED', 'RESOLVED', 'FIXED', 'VERIFIED', 'CLOSED']

const quickActions = [
  { label: 'Add Tenant', icon: 'pi pi-user-plus', severity: 'success' },
  { label: 'Raise Ticket', icon: 'pi pi-comments', severity: 'secondary' }
]

const shortcutButtons = [
  { label: 'Broadcast Update', icon: 'pi pi-megaphone', severity: 'info' },
  { label: 'View Reports', icon: 'pi pi-chart-bar', severity: 'contrast' },
  { label: 'Team Directory', icon: 'pi pi-id-card', severity: 'help' }
]

const formatCount = (value: number) => Number(value ?? 0).toLocaleString('en-US')
const computePercent = (value: number, goal: number) => {
  if (!goal) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round((value / goal) * 100)))
}

const formatHours = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '—'
  }

  if (value >= 24) {
    const days = Math.floor(value / 24)
    const hours = Math.round(value % 24)
    return `${days}d ${hours}h`
  }

  return `${value.toFixed(1)}h`
}

const formatRate = (value: number) => `${Math.round(value)}%`

const openEscalatedModal = () => {
  if (landlordEscalated.value.length) {
    escalatedModalVisible.value = true
  }
}

const topEscalatedIssues = computed(() => landlordEscalated.value.slice(0, 3))
const hasEscalationOverflow = computed(() => landlordEscalated.value.length > 3)
const escalatedModalTitle = computed(() => `Escalated Issues (${landlordEscalated.value.length})`)

const occupancyProgress = computed(() => computePercent(counts.tenant, occupancyGoal))
const workforceProgress = computed(() => computePercent(counts.watchman, watchmanGoal))
const ticketPressure = computed(() => computePercent(counts.support_tickets, ticketGoal))

const statCards = computed(() => [
  {
    key: 'tenant' as EntityKey,
    title: 'Tenants',
    icon: 'pi-users',
    value: formatCount(counts.tenant),
    trend: 'Up 12%',
    severity: 'success',
    caption: 'vs last 7 days',
    accent: 'accent-teal'
  },
  {
    key: 'watchman' as EntityKey,
    title: 'Watchmen',
    icon: 'pi-shield',
    value: formatCount(counts.watchman),
    trend: 'Level',
    severity: 'info',
    caption: `Goal ${watchmanGoal}`,
    accent: 'accent-indigo'
  },
  {
    key: 'support_ticket' as EntityKey,
    title: 'Tickets',
    icon: 'pi-inbox',
    value: formatCount(counts.support_tickets),
    trend: ticketPressure.value > 90 ? 'High load' : 'Stable',
    severity: ticketPressure.value > 90 ? 'danger' : 'warning',
    caption: 'Open work routed by building',
    accent: 'accent-rose'
  }
])

const heroHighlights = computed(() => [
  {
    key: 'tenant',
    label: 'Active Tenants',
    value: formatCount(counts.tenant),
    caption: `${occupancyGoal} unit target`,
    icon: 'pi-home'
  },
  {
    key: 'watchman',
    label: 'Watchmen On Duty',
    value: formatCount(counts.watchman),
    caption: `${watchmanGoal} needed nightly`,
    icon: 'pi-lock'
  },
  {
    key: 'tickets',
    label: 'Tickets Today',
    value: formatCount(counts.support_tickets),
    caption: 'Automated triage enabled',
    icon: 'pi-ticket'
  }
])

const progressSignals = computed(() => [
  {
    label: 'Occupancy rate',
    value: occupancyProgress.value,
    tag: `${counts.tenant}/${occupancyGoal} units`,
    severity: occupancyProgress.value >= 85 ? 'success' : 'info'
  },
  {
    label: 'Support load',
    value: ticketPressure.value,
    tag: ticketPressure.value > 90 ? 'Needs focus' : 'On track',
    severity: ticketPressure.value > 90 ? 'danger' : 'warning'
  },
  {
    label: 'Workforce coverage',
    value: workforceProgress.value,
    tag: `${counts.watchman}/${watchmanGoal} guards`,
    severity: workforceProgress.value >= 80 ? 'success' : 'info'
  }
])

const quickInsights = computed(() => [
  {
    label: 'Resident kudos',
    icon: 'pi pi-heart',
    description: '68 shout-outs submitted this month.',
    severity: 'success',
    badge: '+18%',
    badgeSeverity: 'success'
  },
  {
    label: 'Pending tickets',
    icon: 'pi pi-inbox',
    description: `${formatCount(counts.support_tickets)} open requests awaiting routing.`,
    severity: 'warning',
    badge: ticketPressure.value > 90 ? 'Escalate' : 'Monitor',
    badgeSeverity: ticketPressure.value > 90 ? 'danger' : 'info'
  },
  {
    label: 'Night shift',
    icon: 'pi pi-moon',
    description: `${Math.max(watchmanGoal - counts.watchman, 0)} hires needed for full overnight coverage.`,
    severity: 'info',
    badge: workforceProgress.value >= 80 ? 'Ready' : 'Hire',
    badgeSeverity: workforceProgress.value >= 80 ? 'success' : 'warning'
  }
])

const priorityTickets = computed(() => [
  {
    subject: 'Access card resets',
    detail: '4 urgent lockout requests flagged by concierge bot.',
    status: 'High',
    severity: 'danger'
  },
  {
    subject: 'Maintenance follow-ups',
    detail: `${formatCount(counts.support_tickets)} total tickets, ${ticketGoal} cap for today.`,
    status: ticketPressure.value > 90 ? 'Backlog' : 'On track',
    severity: ticketPressure.value > 90 ? 'warning' : 'success'
  },
  {
    subject: 'Watchman rotations',
    detail: `${formatCount(counts.watchman)} of ${watchmanGoal} confirmed for tonight.`,
    status: workforceProgress.value >= 80 ? 'Staffed' : 'Assign',
    severity: workforceProgress.value >= 80 ? 'info' : 'warning'
  }
])

const handleStatClick = (key: EntityKey) => {
  const target = entityRoutes[key]

  if (target) {
    router.push(target)
  }
}

const { getTableCount } = useSupabaseAuth()

const buildInFilter = (values: string[]) => {
  if (!values.length) {
    return ''
  }

  const tokens = values.map((value) => `"${value}"`)

  return `in.(${tokens.join(',')})`
}

const parseMetadata = (value: unknown) => {
  if (!value) {
    return null
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch {
      return null
    }
  }

  return null
}

const formatTimelineDate = (value?: string) => {
  if (!value) {
    return '--'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatTimestamp = (value?: string) => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const hoursBetween = (start?: string, end?: string) => {
  if (!start || !end) {
    return null
  }

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }

  const diffMs = endDate.getTime() - startDate.getTime()

  if (diffMs <= 0) {
    return null
  }

  return diffMs / 36e5
}

const formatEventLabel = (eventType: string) => {
  switch (eventType) {
    case 'VIEWED':
      return 'Viewed by team'
    case 'IN_PROGRESS':
      return 'Work in progress'
    case 'FIXED':
      return 'Fix applied'
    case 'COMPLETED':
      return 'Ticket completed'
    case 'VERIFIED':
      return 'Resolution verified'
    default:
      return eventType.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
  }
}

const loadLandlordTransparencyData = async (token: string, userId: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    landlordMetricsError.value = 'Supabase configuration is missing.'
    return
  }

  if (!token || !userId) {
    landlordMetricsError.value = 'Missing landlord session information.'
    return
  }

  landlordMetricsLoading.value = true
  landlordMetricsError.value = ''
  landlordSummary.total = 0
  landlordSummary.open = 0
  landlordSummary.completed = 0
  landlordSummary.avgResolutionHours = 0
  landlordWatchmen.value = []
  landlordBuildings.value = []
  landlordEscalated.value = []

  try {
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }

    const tickets =
      (await $fetch<LandlordTicketRecord[]>(`${supabaseUrl}/rest/v1/landlord_support_tickets_view`, {
        method: 'GET',
        query: {
          select:
            'support_ticket_id,title,description,status,photo_url,tenant_name,unit_number,watchman_name,building_name,escalated,created_at,updated_at',
          landlord_user_id: `eq.${userId}`,
          order: 'created_at.desc',
          limit: 500
        },
        headers
      })) || []

    const total = tickets.length
    let open = 0
    let completed = 0
    const resolutionDurations: number[] = []
    const watchmanMap = new Map<
      string,
      { total: number; completed: number; durations: number[] }
    >()
    const buildingMap = new Map<string, { total: number; open: number }>()
    const escalatedTickets: LandlordTicketRecord[] = []

    tickets.forEach((ticket) => {
      const status = (ticket.status || '').toUpperCase()
      const isEscalated = Boolean(ticket.escalated) || status === 'ESCALATED'
      const resolved = resolvedStatuses.includes(status)

      if (resolved) {
        completed++
      } else {
        open++
      }

      const duration = resolved ? hoursBetween(ticket.created_at, ticket.updated_at) : null

      if (duration) {
        resolutionDurations.push(duration)
      }

      const watchmanKey = (ticket.watchman_name || 'Unassigned').trim() || 'Unassigned'
      const watchmanEntry = watchmanMap.get(watchmanKey) || { total: 0, completed: 0, durations: [] }
      watchmanEntry.total += 1
      if (resolved) {
        watchmanEntry.completed += 1
        if (duration) {
          watchmanEntry.durations.push(duration)
        }
      }
      watchmanMap.set(watchmanKey, watchmanEntry)

      const buildingKey = (ticket.building_name || 'Unassigned').trim() || 'Unassigned'
      const buildingEntry = buildingMap.get(buildingKey) || { total: 0, open: 0 }
      buildingEntry.total += 1
      if (!resolved) {
        buildingEntry.open += 1
      }
      buildingMap.set(buildingKey, buildingEntry)

      if (isEscalated) {
        escalatedTickets.push(ticket)
      }
    })

    landlordSummary.total = total
    landlordSummary.open = open
    landlordSummary.completed = completed
    landlordSummary.avgResolutionHours =
      resolutionDurations.length > 0
        ? resolutionDurations.reduce((sum, value) => sum + value, 0) / resolutionDurations.length
        : 0

    landlordWatchmen.value = Array.from(watchmanMap.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        completionRate: data.total ? (data.completed / data.total) * 100 : 0,
        avgResolutionHours:
          data.durations.length > 0
            ? data.durations.reduce((sum, value) => sum + value, 0) / data.durations.length
            : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    landlordBuildings.value = Array.from(buildingMap.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        open: data.open
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    landlordEscalated.value = escalatedTickets.sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate
    })
  } catch (error) {
    const err = error as { data?: { message?: string }; message?: string }
    landlordMetricsError.value = err?.data?.message ?? err?.message ?? 'Unable to load landlord metrics.'
  } finally {
    landlordMetricsLoading.value = false
  }
}

const loadIotSummary = async (token: string, userId: string) => {
  iotSummaryError.value = ''
  const result = await fetchIotOverview(token, userId)
  if (result.error || !result.data) {
    iotSummaryError.value = result.error || 'Unable to load IoT monitoring summary.'
    return
  }

  Object.assign(iotSummary, result.data)
}

onMounted(async () => {
  if (!process.client) {
    return
  }

  const storedToken = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY)
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
  supabaseToken.value = storedToken || ''
  landlordUserId.value = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''

  if (!storedToken) {
    errorMessage.value = 'You are not signed in. Please log in first.'

    return
  }

  if (!['authenticated', 'LANDLORD', 'WATCHMAN'].includes(role.value)) {
    return
  }

  loading.value = true

  const [tenantResult, watchmanResult, supportTicketsResult] = await Promise.all([
    getTableCount('tenant', storedToken),
    getTableCount('watchman', storedToken),
    getTableCount('support_ticket', storedToken)
  ])

  loading.value = false

  counts.tenant = tenantResult.count || 0
  counts.watchman = watchmanResult.count || 0
  counts.support_tickets = supportTicketsResult.count || 0

  errorMessage.value = tenantResult.error || watchmanResult.error || supportTicketsResult.error || ''

  if (role.value === 'LANDLORD') {
    await Promise.all([
      loadLandlordTransparencyData(storedToken, landlordUserId.value),
      loadIotSummary(storedToken, landlordUserId.value)
    ])
  }
})
</script>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  padding: 2.5rem 1rem 4rem;
  background: var(--color-soft-linen-300);
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1200px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-card :deep(.p-card-body) {
  border-radius: 1.5rem;
  padding: 2.25rem;
  background: var(--color-carbon-black-900);
  color: var(--color-soft-linen-50);
}

.hero-card__layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 2rem;
  align-items: start;
}

.hero-card__copy h1 {
  margin: 0.35rem 0 0.5rem;
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  font-weight: 700;
}

.hero-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-card__headline {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.hero-card__copy p {
  margin: 0 0 1.25rem;
  color: rgba(255, 255, 255, 0.92);
}

.hero-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.hero-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.hero-highlight {
  background: rgba(15, 23, 42, 0.25);
  border-radius: 1rem;
  padding: 0.85rem;
  display: flex;
  gap: 0.85rem;
  align-items: center;
}

.hero-highlight__icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  place-items: center;
  font-size: 1.2rem;
}

.hero-highlight span {
  font-size: 0.9rem;
  opacity: 0.85;
}

.hero-highlight p {
  margin: 0.1rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #fff;
}

.hero-highlight small {
  opacity: 0.75;
}

.hero-card__summary {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.hero-metric {
  background: rgba(15, 23, 42, 0.35);
  padding: 1rem;
  border-radius: 1rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.hero-metric__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;
}

.stat-card :deep(.p-card-body) {
  border-radius: 1.2rem;
  padding: 1.5rem;
  color: #0f172a;
  background: #fff;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
}

.stat-card__title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
}

.stat-card__title i {
  font-size: 1.2rem;
}

.stat-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.stat-card .count {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: inherit;
}

.stat-card--interactive {
  cursor: pointer;
}

.stat-card--interactive :deep(.p-card-body) {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card--interactive:focus-visible :deep(.p-card-body),
.stat-card--interactive:hover :deep(.p-card-body) {
  transform: translateY(-4px);
  box-shadow: 0 20px 35px rgba(15, 23, 42, 0.18);
}

.stat-card--interactive:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 4px;
}

.stat-card.small :deep(.p-skeleton) {
  width: 80px;
}

.accent-teal :deep(.p-card-body) {
  border-top: 4px solid #14b8a6;
}

.accent-indigo :deep(.p-card-body) {
  border-top: 4px solid #6366f1;
}

.accent-rose :deep(.p-card-body) {
  border-top: 4px solid #f43f5e;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.widget-card :deep(.p-card-body) {
  border-radius: 1.2rem;
  padding: 1.6rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
}

.hero-card__transparency {
  grid-column: 1 / -1;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.2rem;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.transparency-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.transparency-header span {
  display: block;
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
}

.transparency-header p {
  margin: 0.2rem 0 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.85rem;
}

.transparency-mini-loading {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.transparency-pill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.65rem;
}

.pill {
  border-radius: 0.9rem;
  padding: 0.65rem 0.85rem;
  color: var(--color-carbon-black-900);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pill span {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pill strong {
  font-size: 1.35rem;
}

.pill.accent-gold {
  background: var(--color-sunflower-gold-400);
}

.pill.accent-rose {
  background: #fecdd3;
}

.pill.accent-teal {
  background: #a7f3d0;
}

.pill.accent-indigo {
  background: var(--color-indigo-velvet-400);
  color: #fff;
}

.transparency-mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
}

.mini-panel {
  border-radius: 0.9rem;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.mini-panel--wide {
  grid-column: span 2;
}

.mini-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.mini-panel__header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #fff;
}

.mini-panel__header small {
  color: rgba(255, 255, 255, 0.65);
}

.mini-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.mini-panel li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  color: #fff;
}

.mini-panel small {
  color: rgba(255, 255, 255, 0.6);
}

.empty-escalation-text {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.escalation-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.escalation-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.escalation-list li:last-child {
  border-bottom: none;
}

.escalation-list small {
  color: rgba(255, 255, 255, 0.65);
}

.escalation-list p {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.85rem;
}

.escalation-meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-end;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
}

.escalation-list.modal {
  color: var(--color-carbon-black-900);
}

.escalation-list.modal li {
  border-bottom: 1px solid var(--color-soft-linen-200);
}

.escalation-list.modal small {
  color: var(--color-carbon-black-600);
}

.escalation-list.modal p {
  color: var(--color-carbon-black-700);
}

.escalation-meta span {
  font-size: 0.8rem;
}

.escalation-dialog :deep(.p-dialog-content) {
  padding-bottom: 1.5rem;
}

.insight,
.ticket {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px dashed #e2e8f0;
}

.insight:last-child,
.ticket:last-child {
  border-bottom: none;
}

.insight p,
.ticket p {
  flex: 1;
  margin: 0;
  color: #475569;
}

.ticket strong {
  display: block;
  margin-bottom: 0.15rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.65rem;
}

.actions-grid :deep(.p-button) {
  width: 100%;
}

.iot-dashboard-card :deep(.p-card-body) {
  border-radius: 1.2rem;
  padding: 1.1rem;
}

.iot-dashboard-card__title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.iot-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.7rem;
}

.iot-summary-item {
  border: 1px solid var(--color-soft-linen-200);
  border-radius: 0.8rem;
  padding: 0.7rem;
  background: #fff;
}

.iot-summary-item span {
  display: block;
  font-size: 0.75rem;
  color: var(--color-carbon-black-600);
}

.iot-summary-item strong {
  font-size: 1.4rem;
  color: var(--color-carbon-black-800);
}

@media (max-width: 640px) {
  .dashboard-page {
    padding: 1.5rem 1rem 2.5rem;
  }
}
</style>
