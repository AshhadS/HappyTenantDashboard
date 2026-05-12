<template>
  <main class="ops-page">
    <div class="page-shell">
      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

      <template v-else-if="hubData">
        <section class="ops-header">
          <div class="ops-header__content">
            <div>
              <Button label="Back to Buildings" icon="pi pi-arrow-left" text severity="secondary" @click="router.push('/tickets')" />
              <div class="ops-header__heading">
                <small>{{ hubData.buildingId }}</small>
                <h1>{{ hubData.buildingName }}</h1>
              </div>
            </div>

            <div class="ops-header__summary">
              <Tag :value="hubData.summary.isOnline ? 'ONLINE' : 'OFFLINE'" :severity="hubData.summary.isOnline ? 'success' : 'danger'" rounded />
              <div class="ops-stat"><span>Active Sensors</span><strong>{{ hubData.summary.activeSensorCount }}</strong></div>
              <div class="ops-stat"><span>Open Tickets</span><strong>{{ hubData.summary.openTicketsCount }}</strong></div>
              <div class="ops-stat"><span>Incidents</span><strong>{{ hubData.summary.activeIncidentsCount }}</strong></div>
              <div class="ops-stat"><span>Offline Devices</span><strong>{{ hubData.summary.offlineDeviceCount }}</strong></div>
            </div>
          </div>

          <div class="ops-header__actions">
            <Button
              label="View Transparency Profile"
              icon="pi pi-external-link"
              severity="secondary"
              outlined
              @click="router.push(`/buildings/${hubData.buildingId}`)"
            />
          </div>
        </section>

        <section class="ops-strip">
          <StatusPill v-for="status in liveStatusItems" :key="status.label" :label="status.label" :tone="status.tone" :icon="status.icon" />
        </section>

        <section class="ops-layout">
          <Card class="ops-section">
            <template #title>Gateways</template>
            <template #content>
              <div v-if="hubData.gateways.length" class="gateway-grid">
                <article v-for="gateway in hubData.gateways" :key="gateway.id" class="gateway-card">
                  <div class="gateway-card__top">
                    <div>
                      <small>{{ gateway.location_label || 'Gateway location pending' }}</small>
                      <h3>{{ gateway.gateway_code || 'Unnamed gateway' }}</h3>
                    </div>
                    <Tag :value="gateway.status || '--'" :severity="gatewayStatusSeverity(gateway.status)" rounded />
                  </div>
                  <div class="gateway-card__meta">
                    <span>Sensors attached: {{ gateway.sensorsAttached }}</span>
                    <span>Last seen: {{ formatDateTime(gateway.last_seen_at) }}</span>
                    <span>Registered: {{ formatDateTime(gateway.created_at) }}</span>
                  </div>
                </article>
              </div>
              <Message v-else severity="info" :closable="false">No gateways are registered for this building yet.</Message>
            </template>
          </Card>

          <Card class="ops-section">
            <template #title>Active Incidents</template>
            <template #content>
              <div v-if="activeIncidents.length" class="incident-grid">
                <IncidentCard v-for="incident in activeIncidents" :key="incident.id" :incident="incident" />
              </div>
              <Message v-else severity="success" :closable="false">No active incidents. Building systems look stable.</Message>
            </template>
          </Card>

          <Card class="ops-section">
            <template #title>Open Tickets</template>
            <template #content>
              <div v-if="visibleOpenTickets.length" class="ticket-list">
                <article
                  v-for="ticket in visibleOpenTickets"
                  :key="ticket.id"
                  class="ticket-row"
                  role="button"
                  tabindex="0"
                  @click="openTicketDetail(ticket.id)"
                  @keyup.enter="openTicketDetail(ticket.id)"
                >
                  <div class="ticket-row__main">
                    <div class="ticket-row__title">
                      <small>{{ ticket.unitNumber ? `Unit ${ticket.unitNumber}` : ticket.tenantName || 'Common Area' }}</small>
                      <h4>{{ ticket.title }}</h4>
                    </div>
                    <p>{{ ticket.assignedWatchman || 'Unassigned watchman' }} - {{ ticket.linkedSensorName || 'Manual follow-up' }}</p>
                    <div class="ticket-card__chips">
                      <Tag v-if="ticket.source === 'IOT_AUTO'" value="Auto-detected" severity="info" rounded />
                      <Tag v-if="ticket.linkedIotIncidentId" value="Sensor-linked" severity="warning" rounded />
                      <Tag
                        v-if="ticket.verificationStatus"
                        :value="verificationLabel(ticket.verificationStatus)"
                        :severity="verificationSeverity(ticket.verificationStatus)"
                        rounded
                      />
                    </div>
                  </div>
                  <div class="ticket-row__meta">
                    <Tag :value="ticket.status || '--'" :severity="ticketStatusSeverity(ticket.status)" rounded />
                    <small>{{ formatDateTime(ticket.updatedAt || ticket.createdAt) }}</small>
                  </div>
                </article>
                <div v-if="hasMoreOpenTickets" class="ticket-list__actions">
                  <Button
                    label="Load More"
                    icon="pi pi-angle-down"
                    severity="secondary"
                    text
                    @click="visibleTicketCount += 5"
                  />
                </div>
              </div>
              <Message v-else severity="info" :closable="false">No open tickets for this building.</Message>
            </template>
          </Card>

          <Card class="ops-section">
            <template #title>Active Sensors</template>
            <template #content>
              <div v-if="hubData.sensors.length" class="sensor-grid">
                <SensorCard v-for="sensor in hubData.sensors" :key="sensor.id" :sensor="sensor" />
              </div>
              <Message v-else severity="info" :closable="false">No sensors are registered for this building yet.</Message>
            </template>
          </Card>

          <div class="ops-columns">
            <Card class="ops-section">
              <template #title>Building Activity Feed</template>
              <template #content>
                <ul v-if="hubData.activityFeed.length" class="activity-feed">
                  <li v-for="item in hubData.activityFeed" :key="item.id">
                    <span :class="['activity-dot', `tone-${item.severity}`]" />
                    <div>
                      <strong>{{ item.title }}</strong>
                      <small>{{ formatDateTime(item.timestamp) }}</small>
                      <p>{{ item.detail }}</p>
                    </div>
                  </li>
                </ul>
                <Message v-else severity="info" :closable="false">No recent building activity was found.</Message>
              </template>
            </Card>

            <Card class="ops-section">
              <template #title>Device Health</template>
              <template #content>
                <div class="health-grid">
                  <div class="health-metric">
                    <span>Offline sensors</span>
                    <strong>{{ hubData.healthPanel.offlineSensors.length }}</strong>
                  </div>
                  <div class="health-metric">
                    <span>Offline gateways</span>
                    <strong>{{ hubData.healthPanel.offlineGateways.length }}</strong>
                  </div>
                  <div class="health-metric">
                    <span>Incidents without ticket</span>
                    <strong>{{ hubData.healthPanel.unlinkedIncidentsCount }}</strong>
                  </div>
                  <div class="health-metric">
                    <span>Awaiting verification</span>
                    <strong>{{ hubData.healthPanel.pendingVerificationCount }}</strong>
                  </div>
                </div>
                <div v-if="healthItems.length" class="health-list">
                  <div v-for="item in healthItems" :key="item.key" class="health-list__item">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.value }}</small>
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <Card v-if="hubData.verificationEvents.length" class="ops-section">
            <template #title>Sensor Verification Events</template>
            <template #content>
              <div class="verification-list">
                <article v-for="event in hubData.verificationEvents" :key="event.id" class="verification-card">
                  <div class="verification-card__top">
                    <div>
                      <small>{{ formatDateTime(event.verified_at || event.created_at) }}</small>
                      <h3>{{ verificationLabel(event.verification_status) }}</h3>
                    </div>
                    <Tag
                      :value="verificationLabel(event.verification_status)"
                      :severity="verificationSeverity(event.verification_status)"
                      rounded
                    />
                  </div>
                  <p>{{ event.evidence_summary || event.verification_type || 'Sensor evidence recorded.' }}</p>
                  <small>{{ event.iot_device?.device_name || event.iot_device?.sensor_code || 'Unknown sensor' }}</small>
                </article>
              </div>
            </template>
          </Card>
        </section>
      </template>

      <div v-else class="ops-loading">
        <Skeleton v-for="index in 5" :key="index" height="120px" borderRadius="1rem" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { BuildingOperationsHubData } from '~/types/buildingOperations'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'
import { useBuildingOperations } from '~/composables/useBuildingOperations'
import IncidentCard from '~/components/operations/IncidentCard.vue'
import SensorCard from '~/components/operations/SensorCard.vue'
import StatusPill from '~/components/operations/StatusPill.vue'

const route = useRoute()
const router = useRouter()
const { fetchBuildingOperationsHub } = useBuildingOperations()

const token = ref('')
const role = ref('')
const userId = ref('')
const errorMessage = ref('')
const hubData = ref<BuildingOperationsHubData | null>(null)
const visibleTicketCount = ref(5)

const buildingId = computed(() => String(route.params.buildingId || ''))

const activeIncidents = computed(() =>
  (hubData.value?.incidents || []).filter((incident) => ['OPEN', 'LINKED_TO_TICKET'].includes((incident.status || '').toUpperCase()))
)

const openTickets = computed(() => {
  const tickets = hubData.value?.tickets || []
  return [...tickets]
    .filter((ticket) => !['COMPLETED', 'FIXED', 'CLOSED', 'RESOLVED', 'VERIFIED'].includes((ticket.status || '').toUpperCase()))
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime()
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime()
      return rightTime - leftTime
    })
})

const visibleOpenTickets = computed(() => openTickets.value.slice(0, visibleTicketCount.value))

const hasMoreOpenTickets = computed(() => openTickets.value.length > visibleOpenTickets.value.length)

const liveStatusItems = computed(() => {
  const incidents = activeIncidents.value
  const leakIncident = incidents.find((incident) => (incident.incident_type || '').toUpperCase().includes('LEAK'))
  const offlineSensorCount = hubData.value?.healthPanel.offlineSensors.length || 0
  const offlineGatewayCount = hubData.value?.healthPanel.offlineGateways.length || 0
  const openTickets = hubData.value?.summary.openTicketsCount || 0

  return [
    {
      label: leakIncident ? `Leak incident at ${leakIncident.iot_device?.location_label || 'building system'}` : 'No active leak incident',
      tone: leakIncident ? 'critical' : 'normal',
      icon: 'pi-tint'
    },
    {
      label: offlineSensorCount ? `${offlineSensorCount} sensor${offlineSensorCount > 1 ? 's' : ''} offline` : 'Sensors reporting normally',
      tone: offlineSensorCount ? 'warning' : 'normal',
      icon: 'pi-wifi'
    },
    {
      label: offlineGatewayCount ? `${offlineGatewayCount} gateway${offlineGatewayCount > 1 ? 's' : ''} offline` : 'Gateways online',
      tone: offlineGatewayCount ? 'warning' : 'normal',
      icon: 'pi-server'
    },
    {
      label: openTickets ? `${openTickets} open maintenance ticket${openTickets > 1 ? 's' : ''}` : 'No open maintenance tickets',
      tone: openTickets ? 'warning' : 'normal',
      icon: 'pi-briefcase'
    }
  ] as { label: string; tone: 'normal' | 'warning' | 'critical'; icon: string }[]
})

const healthItems = computed(() => {
  if (!hubData.value) {
    return []
  }

  const items: { key: string; label: string; value: string }[] = []

  hubData.value.healthPanel.offlineSensors.slice(0, 3).forEach((sensor) => {
    items.push({
      key: `sensor-${sensor.id}`,
      label: sensor.device_name || sensor.sensor_code || 'Offline sensor',
      value: sensor.location_label || 'Location pending'
    })
  })

  hubData.value.healthPanel.offlineGateways.slice(0, 3).forEach((gateway) => {
    items.push({
      key: `gateway-${gateway.id}`,
      label: gateway.gateway_code || 'Offline gateway',
      value: gateway.location_label || 'Gateway location pending'
    })
  })

  return items
})

const ticketStatusSeverity = (status?: string | null) => {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'OPEN') return 'warning'
  if (normalized === 'IN_PROGRESS') return 'info'
  if (['FIXED', 'COMPLETED', 'VERIFIED', 'RESOLVED'].includes(normalized)) return 'success'
  return 'secondary'
}

const gatewayStatusSeverity = (status?: string | null) => {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'OFFLINE') return 'danger'
  if (normalized === 'ACTIVE' || normalized === 'ONLINE') return 'success'
  return 'warning'
}

const verificationLabel = (status?: string | null) => {
  switch ((status || '').toUpperCase()) {
    case 'SUPPORTED':
      return 'Verified by sensor'
    case 'PENDING':
      return 'Awaiting verification'
    case 'FAILED':
      return 'Sensor verification failed'
    default:
      return status || '--'
  }
}

const verificationSeverity = (status?: string | null) => {
  switch ((status || '').toUpperCase()) {
    case 'SUPPORTED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'FAILED':
      return 'danger'
    default:
      return 'secondary'
  }
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Recent'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

const openTicketDetail = (ticketId: string) => {
  router.push(`/tickets/${buildingId.value}/${ticketId}`)
}

const loadHub = async () => {
  if (!token.value) {
    errorMessage.value = 'You are not signed in.'
    return
  }

  errorMessage.value = ''
  visibleTicketCount.value = 5
  const result = await fetchBuildingOperationsHub(token.value, role.value, userId.value, buildingId.value)
  hubData.value = result.data
  errorMessage.value = result.error || ''
}

onMounted(async () => {
  if (!process.client) {
    return
  }

  token.value = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
  userId.value = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''
  await loadHub()
})

watch(
  () => buildingId.value,
  async (next, previous) => {
    if (!next || next === previous) {
      return
    }

    await loadHub()
  }
)
</script>

<style scoped>
.ops-page {
  min-height: 100vh;
  padding: 1.6rem 1rem 3rem;
  background:
    radial-gradient(circle at top right, rgba(228, 168, 27, 0.12), transparent 24%),
    var(--color-soft-linen-300);
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1320px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ops-loading {
  display: grid;
  gap: 0.9rem;
}

.ops-header {
  position: sticky;
  top: 1rem;
  z-index: 4;
  border: 1px solid rgba(27, 25, 24, 0.08);
  border-radius: 1.2rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.ops-header__content {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.ops-header__heading small {
  color: var(--color-carbon-black-500);
}

.ops-header__heading h1 {
  margin: 0.25rem 0 0;
  color: var(--color-carbon-black-900);
}

.ops-header__summary {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.ops-stat {
  min-width: 120px;
  border-radius: 0.9rem;
  background: var(--color-soft-linen-50);
  padding: 0.65rem 0.75rem;
}

.ops-stat span {
  display: block;
  font-size: 0.73rem;
  color: var(--color-carbon-black-600);
}

.ops-stat strong {
  color: var(--color-carbon-black-900);
  font-size: 1.2rem;
}

.ops-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ops-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.ops-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ops-section :deep(.p-card-body) {
  border-radius: 1rem;
  padding: 1rem;
}

.incident-grid,
.sensor-grid,
.gateway-grid,
.verification-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.8rem;
}

.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ticket-row,
.gateway-card,
.verification-card {
  border-radius: 0.85rem;
  background: #fff;
  border: 1px solid var(--color-soft-linen-200);
  padding: 0.75rem;
  display: flex;
  gap: 1rem;
}

.ticket-row {
  justify-content: space-between;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.ticket-row:hover,
.ticket-row:focus-visible {
  border-color: var(--color-sunflower-gold-500);
  transform: translateY(-1px);
  outline: none;
}

.ticket-row__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ticket-row__title small {
  color: var(--color-carbon-black-500);
}

.ticket-row__title h4 {
  margin: 0.15rem 0 0;
  color: var(--color-carbon-black-900);
}

.gateway-card__top,
.verification-card__top {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
}

.gateway-card__top small,
.verification-card__top small {
  color: var(--color-carbon-black-500);
}

.gateway-card__top h3,
.verification-card__top h3 {
  margin: 0.15rem 0 0;
  color: var(--color-carbon-black-900);
}

.ticket-row__main p,
.verification-card p {
  margin: 0;
  color: var(--color-carbon-black-700);
  font-size: 0.9rem;
}

.ticket-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.ticket-row__meta {
  flex: 0 0 auto;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.ticket-row__meta small {
  color: var(--color-carbon-black-500);
  text-align: right;
}

.ticket-list__actions {
  display: flex;
  justify-content: center;
}

.gateway-card__meta {
  display: grid;
  gap: 0.25rem;
  color: var(--color-carbon-black-700);
  font-size: 0.9rem;
}

.ops-columns {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1rem;
}

.activity-feed {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.activity-feed li {
  display: flex;
  gap: 0.75rem;
}

.activity-feed strong {
  display: block;
  color: var(--color-carbon-black-900);
}

.activity-feed small {
  display: block;
  color: var(--color-carbon-black-500);
  margin-top: 0.1rem;
}

.activity-feed p {
  margin: 0.2rem 0 0;
  color: var(--color-carbon-black-700);
}

.activity-dot {
  width: 12px;
  height: 12px;
  margin-top: 0.35rem;
  border-radius: 50%;
  flex: 0 0 auto;
}

.tone-normal {
  background: #22c55e;
}

.tone-warning {
  background: #f59e0b;
}

.tone-critical {
  background: #ef4444;
}

.tone-success {
  background: #16a34a;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.health-metric,
.health-list__item {
  border-radius: 0.85rem;
  background: #fff;
  border: 1px solid var(--color-soft-linen-200);
  padding: 0.75rem;
}

.health-metric span,
.health-list__item small {
  display: block;
  color: var(--color-carbon-black-600);
  font-size: 0.75rem;
}

.health-metric strong,
.health-list__item strong {
  color: var(--color-carbon-black-900);
  font-size: 1.1rem;
}

.health-list {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.8rem;
}

@media (max-width: 900px) {
  .ops-columns {
    grid-template-columns: 1fr;
  }

  .ticket-row {
    flex-direction: column;
  }

  .ticket-row__meta {
    min-width: 0;
    align-items: flex-start;
  }

  .ticket-row__meta small {
    text-align: left;
  }
}
</style>
