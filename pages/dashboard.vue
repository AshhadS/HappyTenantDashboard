<template>
  <main class="dashboard-page">
    <div class="page-shell">
      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
      <Message v-else-if="role !== 'authenticated'" severity="warn" :closable="false">
        You are signed in as <strong>{{ role || 'user' }}</strong>. Dashboard cards are available for super admins only.
      </Message>

      <section v-else class="dashboard-content">
        <Card class="hero-card">
          <template #content>
            <div class="hero-card__layout">
              <div class="hero-card__copy">
                <Tag value="Live environment" icon="pi pi-bolt" severity="warning" rounded />
                <h1>Neighborhood health at a glance</h1>
                <p>
                  Keep every tenant, watchman, and support ticket flowing smoothly with colorful signals that react to your live
                  Supabase data.
                </p>

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

                <div class="hero-highlights">
                  <div class="hero-highlight" v-for="highlight in heroHighlights" :key="highlight.key">
                    <div class="hero-highlight__icon">
                      <i :class="['pi', highlight.icon]"></i>
                    </div>
                    <div>
                      <span>{{ highlight.label }}</span>
                      <p>{{ loading ? '...' : highlight.value }}</p>
                      <small>{{ highlight.caption }}</small>
                    </div>
                  </div>
                </div>
              </div>

              <div class="hero-card__summary">
                <div class="hero-metric" v-for="signal in progressSignals" :key="signal.label">
                  <div class="hero-metric__header">
                    <span>{{ signal.label }}</span>
                    <Tag :value="signal.tag" :severity="signal.severity" rounded />
                  </div>
                  <ProgressBar :value="signal.value" showValue></ProgressBar>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <div class="stats-grid">
          <Card v-for="stat in statCards" :key="stat.title" :class="['stat-card', stat.accent]">
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

        <div class="widgets-grid">
          <Card class="widget-card">
            <template #title>Quick Insights</template>
            <template #content>
              <div class="insight" v-for="insight in quickInsights" :key="insight.label">
                <Tag :value="insight.label" :icon="insight.icon" :severity="insight.severity" rounded />
                <p>{{ insight.description }}</p>
                <Badge :value="insight.badge" :severity="insight.badgeSeverity" />
              </div>
            </template>
          </Card>

          <Card class="widget-card">
            <template #title>Priority Tickets</template>
            <template #content>
              <div class="ticket" v-for="ticket in priorityTickets" :key="ticket.subject">
                <div>
                  <strong>{{ ticket.subject }}</strong>
                  <p>{{ ticket.detail }}</p>
                </div>
                <Tag :value="ticket.status" :severity="ticket.severity" rounded />
              </div>
            </template>
          </Card>

          <Card class="widget-card">
            <template #title>Shortcuts</template>
            <template #content>
              <div class="actions-grid">
                <Button
                  v-for="action in shortcutButtons"
                  :key="action.label"
                  :label="action.label"
                  :icon="action.icon"
                  :severity="action.severity"
                  outlined
                />
              </div>
            </template>
          </Card>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'

const role = ref('')
const loading = ref(false)
const errorMessage = ref('')
const counts = reactive({
  tenant: 0,
  watchman: 0,
  support_tickets: 0
})

const occupancyGoal = 120
const watchmanGoal = 20
const ticketGoal = 40

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

const occupancyProgress = computed(() => computePercent(counts.tenant, occupancyGoal))
const workforceProgress = computed(() => computePercent(counts.watchman, watchmanGoal))
const ticketPressure = computed(() => computePercent(counts.support_tickets, ticketGoal))

const statCards = computed(() => [
  {
    title: 'Tenants',
    icon: 'pi-users',
    value: formatCount(counts.tenant),
    trend: 'Up 12%',
    severity: 'success',
    caption: 'vs last 7 days',
    accent: 'accent-teal'
  },
  {
    title: 'Watchmen',
    icon: 'pi-shield',
    value: formatCount(counts.watchman),
    trend: 'Level',
    severity: 'info',
    caption: `Goal ${watchmanGoal}`,
    accent: 'accent-indigo'
  },
  {
    title: 'Support Tickets',
    icon: 'pi-inbox',
    value: formatCount(counts.support_tickets),
    trend: ticketPressure.value > 90 ? 'High load' : 'Stable',
    severity: ticketPressure.value > 90 ? 'danger' : 'warning',
    caption: 'Open items tracked in Supabase',
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

  if (role.value !== 'authenticated') {
    return
  }

  loading.value = true

  const [tenantResult, watchmanResult, supportTicketsResult] = await Promise.all([
    getTableCount('tenant', accessToken),
    getTableCount('watchman', accessToken),
    getTableCount('support_ticket', accessToken)
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
  padding: 2.5rem 1rem 4rem;
  background: radial-gradient(circle at top left, #fce7f3, transparent 50%),
    radial-gradient(circle at 20% 80%, #bfdbfe, transparent 45%),
    radial-gradient(circle at right, #fef3c7, transparent 40%), #0f172a;
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
  background: linear-gradient(135deg, #3730a3, #a855f7, #f97316);
  color: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.45);
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

.hero-card__copy p {
  margin: 0 0 1.25rem;
  color: rgba(255, 255, 255, 0.92);
}

.hero-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
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

@media (max-width: 640px) {
  .dashboard-page {
    padding: 1.5rem 1rem 2.5rem;
  }

  .hero-card :deep(.p-card-body) {
    padding: 1.5rem;
  }
}
</style>
