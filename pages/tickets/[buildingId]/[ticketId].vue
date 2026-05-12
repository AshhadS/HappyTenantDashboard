<template>
  <main class="ticket-detail-page">
    <div class="page-shell">
      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

      <template v-else-if="ticketDetail">
        <section class="ticket-hero">
          <div class="ticket-hero__nav">
            <Button label="Back to Building" icon="pi pi-arrow-left" text severity="secondary" @click="router.push(`/tickets/${buildingId}`)" />
          </div>

          <div class="ticket-hero__top">
            <div>
              <small>{{ ticketDetail.buildingId }} / Ticket</small>
              <h1>{{ ticketDetail.title }}</h1>
              <p>{{ ticketDetail.unitNumber ? `Unit ${ticketDetail.unitNumber}` : ticketDetail.tenantName || 'Common Area' }}</p>
            </div>
            <Tag :value="ticketDetail.status || '--'" :severity="ticketStatusSeverity(ticketDetail.status)" rounded />
          </div>

          <div class="ticket-badges">
            <Tag v-if="ticketDetail.source === 'IOT_AUTO'" value="Auto-detected" severity="info" rounded />
            <Tag v-if="ticketDetail.linkedIotIncidentId" value="Sensor-linked" severity="warning" rounded />
            <Tag
              v-if="ticketDetail.verificationStatus"
              :value="verificationLabel(ticketDetail.verificationStatus)"
              :severity="verificationSeverity(ticketDetail.verificationStatus)"
              rounded
            />
            <Tag v-if="ticketDetail.severity" :value="`${ticketDetail.severity} severity`" :severity="severityTone(ticketDetail.severity)" rounded />
          </div>
        </section>

        <section class="ticket-layout">
          <Card class="ticket-section">
            <template #title>Overview</template>
            <template #content>
              <div class="overview-grid">
                <div class="overview-item">
                  <span>Building</span>
                  <strong>{{ ticketDetail.buildingName }}</strong>
                </div>
                <div class="overview-item">
                  <span>Tenant</span>
                  <strong>{{ ticketDetail.tenantName || '--' }}</strong>
                </div>
                <div class="overview-item">
                  <span>Watchman</span>
                  <strong>{{ ticketDetail.assignedWatchman || '--' }}</strong>
                </div>
                <div class="overview-item">
                  <span>Source</span>
                  <strong>{{ sourceLabel(ticketDetail.source) }}</strong>
                </div>
                <div class="overview-item">
                  <span>Created</span>
                  <strong>{{ formatDateTime(ticketDetail.createdAt) }}</strong>
                </div>
                <div class="overview-item">
                  <span>Updated</span>
                  <strong>{{ formatDateTime(ticketDetail.updatedAt) }}</strong>
                </div>
                <div class="overview-item">
                  <span>Unit</span>
                  <strong>{{ ticketDetail.unitNumber || '--' }}</strong>
                </div>
                <div class="overview-item">
                  <span>Floor</span>
                  <strong>{{ ticketDetail.tenantFloor ?? '--' }}</strong>
                </div>
                <div class="overview-item">
                  <span>Tenant Phone</span>
                  <strong>{{ ticketDetail.tenantPhone || '--' }}</strong>
                </div>
                <div class="overview-item">
                  <span>Ticket ID</span>
                  <strong>{{ ticketDetail.id }}</strong>
                </div>
              </div>

              <div class="description-block">
                <h3>Description</h3>
                <p>{{ ticketDetail.description || 'No description provided.' }}</p>
              </div>

              <div v-if="ticketDetail.photoUrl" class="photo-block">
                <h3>Attachment</h3>
                <img :src="ticketDetail.photoUrl" alt="Ticket attachment" />
              </div>
            </template>
          </Card>

          <Card class="ticket-section">
            <template #title>Sensor Evidence</template>
            <template #content>
              <div v-if="ticketDetail.linkedIncident || ticketDetail.verificationEvents.length" class="evidence-layout">
                <div class="evidence-summary">
                  <div class="overview-item">
                    <span>Linked Incident</span>
                    <strong>{{ ticketDetail.linkedIotIncidentId || '--' }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>Sensor</span>
                    <strong>{{ ticketDetail.linkedSensorName || '--' }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>Location</span>
                    <strong>{{ ticketDetail.sensorLocation || '--' }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>Verification</span>
                    <strong>{{ verificationLabel(ticketDetail.verificationStatus) }}</strong>
                  </div>
                  <div v-if="ticketDetail.linkedIncident" class="overview-item">
                    <span>Incident Type</span>
                    <strong>{{ incidentTypeLabel(ticketDetail.linkedIncident.incident_type) }}</strong>
                  </div>
                  <div v-if="ticketDetail.linkedIncident" class="overview-item">
                    <span>Detection Time</span>
                    <strong>{{ formatDateTime(ticketDetail.linkedIncident.started_at) }}</strong>
                  </div>
                  <div v-if="ticketDetail.linkedIncident" class="overview-item">
                    <span>Gateway</span>
                    <strong>{{ gatewayLabel(ticketDetail.linkedIncident) }}</strong>
                  </div>
                  <div v-if="ticketDetail.linkedIncident" class="overview-item">
                    <span>Incident Status</span>
                    <strong>{{ ticketDetail.linkedIncident.status || '--' }}</strong>
                  </div>
                </div>

                <div v-if="ticketDetail.verificationEvents.length" class="verification-stack">
                  <article v-for="event in ticketDetail.verificationEvents" :key="event.id" class="verification-row">
                    <div>
                      <strong>{{ verificationLabel(event.verification_status) }}</strong>
                      <p>{{ event.evidence_summary || event.verification_type || 'Sensor evidence recorded.' }}</p>
                      <small>{{ event.iot_device?.device_name || event.iot_device?.sensor_code || 'Unknown sensor' }}</small>
                    </div>
                    <small>{{ formatDateTime(event.verified_at || event.created_at) }}</small>
                  </article>
                </div>
              </div>
              <Message v-else severity="info" :closable="false">No sensor evidence is linked to this ticket.</Message>
            </template>
          </Card>

          <Card class="ticket-section">
            <template #title>Ticket Timeline</template>
            <template #content>
              <ul v-if="ticketDetail.timelineEvents.length" class="timeline-list">
                <li v-for="event in ticketDetail.timelineEvents" :key="event.id" class="timeline-row">
                  <span :class="['timeline-dot', `tone-${timelineTone(event.eventType)}`]" />
                  <div class="timeline-row__content">
                    <strong>{{ eventLabel(event.eventType) }}</strong>
                    <small>{{ formatDateTime(event.createdAt) }}</small>
                    <p v-if="eventDetailText(event.metadata)">{{ eventDetailText(event.metadata) }}</p>
                  </div>
                </li>
              </ul>
              <Message v-else severity="info" :closable="false">No timeline activity recorded for this ticket yet.</Message>
            </template>
          </Card>
        </section>
      </template>

      <div v-else class="ticket-loading">
        <Skeleton v-for="index in 4" :key="index" height="140px" borderRadius="1rem" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { BuildingOperationsTicketDetail } from '~/types/buildingOperations'
import type { IotIncident } from '~/types/iotMaintenance'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'
import { useBuildingOperations } from '~/composables/useBuildingOperations'

const route = useRoute()
const router = useRouter()
const { fetchTicketDetail } = useBuildingOperations()

const token = ref('')
const role = ref('')
const userId = ref('')
const errorMessage = ref('')
const ticketDetail = ref<BuildingOperationsTicketDetail | null>(null)

const buildingId = computed(() => String(route.params.buildingId || ''))
const ticketId = computed(() => String(route.params.ticketId || ''))

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

const ticketStatusSeverity = (status?: string | null) => {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'OPEN') return 'warning'
  if (normalized === 'IN_PROGRESS') return 'info'
  if (['FIXED', 'COMPLETED', 'VERIFIED', 'RESOLVED'].includes(normalized)) return 'success'
  return 'secondary'
}

const severityTone = (value?: string | null) => {
  const normalized = (value || '').toUpperCase()
  if (['HIGH', 'CRITICAL'].includes(normalized)) return 'danger'
  if (normalized === 'MEDIUM') return 'warning'
  return 'secondary'
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

const sourceLabel = (value?: string | null) => {
  switch ((value || '').toUpperCase()) {
    case 'IOT_AUTO':
      return 'Auto-detected'
    case 'WATCHMAN':
      return 'Watchman'
    case 'TENANT':
      return 'Tenant'
    default:
      return value || '--'
  }
}

const incidentTypeLabel = (value?: string | null) => {
  if (!value) {
    return '--'
  }

  if (value.toUpperCase() === 'WATER_LEAK_DETECTED') {
    return 'Water leak detected'
  }

  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
}

const gatewayLabel = (incident: IotIncident) =>
  incident.iot_device?.iot_gateway?.gateway_code ||
  incident.iot_device?.iot_gateway?.location_label ||
  incident.iot_gateway?.gateway_code ||
  incident.iot_gateway?.location_label ||
  '--'

const eventLabel = (eventType: string) => {
  switch (eventType) {
    case 'VIEWED':
      return 'Viewed'
    case 'IN_PROGRESS':
      return 'Work in progress'
    case 'FIXED':
      return 'Fix applied'
    case 'COMPLETED':
      return 'Completed'
    case 'VERIFIED':
      return 'Verified'
    default:
      return eventType.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
  }
}

const timelineTone = (eventType: string) => {
  switch (eventType) {
    case 'IN_PROGRESS':
      return 'info'
    case 'FIXED':
      return 'warning'
    case 'COMPLETED':
    case 'VERIFIED':
      return 'success'
    default:
      return 'muted'
  }
}

const eventDetailText = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) {
    return ''
  }

  if ('from' in metadata && 'to' in metadata) {
    return `Status changed: ${String(metadata.from)} -> ${String(metadata.to)}`
  }

  if ('note' in metadata) {
    return String(metadata.note)
  }

  return ''
}

const loadTicket = async () => {
  if (!token.value) {
    errorMessage.value = 'You are not signed in.'
    return
  }

  errorMessage.value = ''
  const result = await fetchTicketDetail(token.value, role.value, userId.value, buildingId.value, ticketId.value)
  ticketDetail.value = result.data
  errorMessage.value = result.error || ''
}

onMounted(async () => {
  if (!process.client) {
    return
  }

  token.value = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
  userId.value = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''
  await loadTicket()
})

watch(
  () => route.fullPath,
  async () => {
    await loadTicket()
  }
)
</script>

<style scoped>
.ticket-detail-page {
  min-height: 100vh;
  padding: 1.6rem 1rem 3rem;
  background: var(--color-soft-linen-300);
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1180px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ticket-loading {
  display: grid;
  gap: 0.9rem;
}

.ticket-hero,
.ticket-section :deep(.p-card-body) {
  border-radius: 1rem;
}

.ticket-hero {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(27, 25, 24, 0.08);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.ticket-hero__top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.ticket-hero__top small {
  color: var(--color-carbon-black-500);
}

.ticket-hero__top h1 {
  margin: 0.25rem 0 0.2rem;
  color: var(--color-carbon-black-900);
}

.ticket-hero__top p {
  margin: 0;
  color: var(--color-carbon-black-600);
}

.ticket-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.ticket-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.overview-grid,
.evidence-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
}

.overview-item {
  border-radius: 0.85rem;
  border: 1px solid var(--color-soft-linen-200);
  background: #fff;
  padding: 0.75rem;
}

.overview-item span {
  display: block;
  font-size: 0.74rem;
  color: var(--color-carbon-black-500);
}

.overview-item strong {
  color: var(--color-carbon-black-900);
}

.description-block,
.photo-block {
  margin-top: 1rem;
}

.description-block h3,
.photo-block h3 {
  margin: 0 0 0.45rem;
  color: var(--color-carbon-black-900);
}

.description-block p {
  margin: 0;
  color: var(--color-carbon-black-700);
  line-height: 1.6;
}

.photo-block img {
  max-width: 100%;
  border-radius: 0.9rem;
  border: 1px solid var(--color-soft-linen-200);
}

.evidence-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.verification-stack,
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.verification-row,
.timeline-row {
  border-radius: 0.85rem;
  border: 1px solid var(--color-soft-linen-200);
  background: #fff;
  padding: 0.8rem;
}

.verification-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.verification-row p {
  margin: 0.2rem 0;
  color: var(--color-carbon-black-700);
}

.verification-row small {
  color: var(--color-carbon-black-500);
}

.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.timeline-row {
  display: flex;
  gap: 0.8rem;
}

.timeline-row__content strong {
  color: var(--color-carbon-black-900);
}

.timeline-row__content small {
  display: block;
  color: var(--color-carbon-black-500);
  margin-top: 0.1rem;
}

.timeline-row__content p {
  margin: 0.25rem 0 0;
  color: var(--color-carbon-black-700);
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 0.4rem;
  flex: 0 0 auto;
}

.tone-muted {
  background: var(--color-carbon-black-300);
}

.tone-info {
  background: var(--color-indigo-velvet-500);
}

.tone-warning {
  background: var(--color-sunflower-gold-500);
}

.tone-success {
  background: #16a34a;
}

@media (max-width: 700px) {
  .ticket-hero__top,
  .verification-row {
    flex-direction: column;
  }
}
</style>
