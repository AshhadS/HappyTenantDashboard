<template>
  <main class="entity-page">
    <div class="page-shell">
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
            <div v-if="isSupportTicketView" class="ticket-filters">
              <Button
                v-for="option in ticketFilterOptions"
                :key="option.value"
                :label="option.label"
                size="small"
                :severity="ticketFilter === option.value ? 'info' : 'secondary'"
                :outlined="ticketFilter !== option.value"
                @click="ticketFilter = option.value"
              />
            </div>

            <div v-if="loading" class="table-loading">
              <Skeleton height="3.5rem" borderRadius="12px" />
              <Skeleton height="3.5rem" borderRadius="12px" />
              <Skeleton height="3.5rem" borderRadius="12px" />
            </div>

            <template v-else>
              <DataTable
                v-if="filteredRows.length"
                :value="filteredRows"
                :dataKey="tableDataKey"
                :rowClass="getRowClass"
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
                    <span>{{ filteredRows.length }} records loaded</span>
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
                    <template v-if="column.field === 'created_at'">
                      <span class="created-cell" :title="getUpdatedTooltip(data)">
                        {{ formatCell(data[column.field], column.field) }}
                      </span>
                    </template>
                    <template v-else-if="isSupportTicketView && column.field === 'title'">
                      <div class="ticket-title-cell">
                        <span>{{ formatCell(data[column.field], column.field) }}</span>
                        <div class="ticket-iot-badges" v-if="getTicketIotBadges(data).length">
                          <Tag
                            v-for="badge in getTicketIotBadges(data)"
                            :key="`${badge.label}-${badge.severity}`"
                            :value="badge.label"
                            :severity="badge.severity"
                            rounded
                            class="iot-badge"
                          />
                        </div>
                        <small v-if="getTicketIotMetaLine(data)" class="ticket-iot-meta">{{ getTicketIotMetaLine(data) }}</small>
                      </div>
                    </template>
                    <template v-else-if="isSupportTicketView && column.field === 'status'">
                      <Tag
                        :value="formatCell(data[column.field], column.field)"
                        :severity="isTicketOverdue(data) ? 'danger' : 'info'"
                        rounded
                        class="status-tag"
                      />
                      <small v-if="isTicketOverdue(data)" class="overdue-delay">{{ getDelayText(data) }}</small>
                    </template>
                    <template v-else>
                      {{ formatCell(data[column.field], column.field) }}
                    </template>
                  </template>
                </Column>

                <Column header="Actions">
                  <template #body="{ data }">
                    <div class="action-buttons">
                      <Button label="View" icon="pi pi-search" size="small" severity="secondary" text @click="openRecordDetail(data)" />
                      <Button
                        v-if="isSupportTicketView"
                        label="Timeline"
                        icon="pi pi-clock"
                        size="small"
                        severity="info"
                        text
                        @click="openTimelineDialog(data)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>

              <Message v-else severity="info" :closable="false">No records match the selected filter.</Message>
            </template>
          </div>
        </template>
      </Card>

      <Dialog
        v-model:visible="detailDialogVisible"
        modal
        :header="detailDialogTitle"
        class="detail-dialog"
        :style="{ width: 'min(1220px, 92vw)' }"
      >
        <template v-if="isSupportTicketView && ticketDetail">
          <div class="ticket-dialog">
            <div class="ticket-dialog__header">
              <div>
                <Tag
                  :value="ticketDetail.status"
                  :severity="isTicketOverdue(detailRecord || {}) ? 'danger' : 'info'"
                  rounded
                />
                <Tag
                  v-for="badge in getTicketIotBadges(detailRecord || {})"
                  :key="`detail-${badge.label}-${badge.severity}`"
                  :value="badge.label"
                  :severity="badge.severity"
                  rounded
                  class="ticket-priority-tag"
                />
                <Tag
                  v-if="ticketDetail.priority && ticketDetail.priority !== '--'"
                  :value="`Priority: ${ticketDetail.priority}`"
                  severity="warning"
                  rounded
                  class="ticket-priority-tag"
                />
                <h3>{{ ticketDetail.title }}</h3>
                <p>{{ ticketDetail.subject }}</p>
              </div>
              <div class="ticket-dialog__meta">
                <div>
                  <span class="meta-label">Ticket ID</span>
                  <strong>{{ ticketDetail.ticketId }}</strong>
                </div>
                <div>
                  <span class="meta-label">Created</span>
                  <strong>{{ ticketDetail.created }}</strong>
                </div>
                <div>
                  <span class="meta-label">Updated</span>
                  <strong>{{ ticketDetail.updated }}</strong>
                </div>
                <div v-if="ticketDetail.delay">
                  <span class="meta-label">Delay</span>
                  <strong class="delay-chip">{{ ticketDetail.delay }}</strong>
                </div>
              </div>
            </div>

            <div class="ticket-dialog__body">
              <p class="ticket-dialog__description">
                {{ ticketDetail.description }}
              </p>

              <div class="ticket-dialog__grid">
                <div>
                  <span class="meta-label">Tenant</span>
                  <strong>{{ ticketDetail.tenant }}</strong>
                </div>
                <div>
                  <span class="meta-label">Watchman</span>
                  <strong>{{ ticketDetail.watchman }}</strong>
                </div>
                <div v-if="ticketDetail.building && ticketDetail.building !== '--'">
                  <span class="meta-label">Building</span>
                  <strong>{{ ticketDetail.building }}</strong>
                </div>
              </div>

              <div
                v-if="ticketSensorEvidenceVisible"
                class="sensor-evidence"
              >
                <div class="sensor-evidence__header">
                  <h4>Sensor Evidence</h4>
                  <Tag
                    v-if="ticketDetail.verificationStatus && ticketDetail.verificationStatus !== '--'"
                    :value="formatVerificationLabel(ticketDetail.verificationStatus)"
                    :severity="verificationSeverity(ticketDetail.verificationStatus)"
                    rounded
                  />
                </div>
                <Message v-if="sensorEvidenceLoading" severity="info" :closable="false">Loading sensor evidence...</Message>
                <Message v-else-if="sensorEvidenceError" severity="warn" :closable="false">{{ sensorEvidenceError }}</Message>
                <div v-else class="sensor-evidence__grid">
                  <div>
                    <span class="meta-label">Ticket Source</span>
                    <strong>{{ formatSourceLabel(ticketDetail.source) }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Linked IoT Incident</span>
                    <strong>{{ ticketDetail.linkedIncident || '--' }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Sensor / Device</span>
                    <strong>{{ incidentDeviceName }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Sensor Location</span>
                    <strong>{{ incidentDeviceLocation }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Gateway</span>
                    <strong>{{ incidentGatewayName }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Incident Type</span>
                    <strong>{{ formatIncidentType(sensorIncident?.incident_type) }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Incident Severity</span>
                    <strong>{{ sensorIncident?.severity || '--' }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Detection Time</span>
                    <strong>{{ formatCell(sensorIncident?.started_at, 'started_at') }}</strong>
                  </div>
                  <div>
                    <span class="meta-label">Evidence Summary</span>
                    <strong>{{ latestEvidenceSummary }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-if="detailEntries.length" class="detail-grid">
            <div v-for="item in detailEntries" :key="item.key" class="detail-row">
              <span class="detail-label">{{ item.label }}</span>
              <span class="detail-value">{{ item.value }}</span>
            </div>
          </div>
          <Message v-else severity="info" :closable="false">No details available.</Message>
        </template>
      </Dialog>

      <Dialog
        v-model:visible="timelineDialogVisible"
        modal
        :header="`Timeline · ${timelineTicketTitle}`"
        class="timeline-dialog"
        :style="{ width: 'min(520px, 92vw)' }"
      >
        <div v-if="timelineLoading" class="timeline-loading">
          <Skeleton height="2.75rem" borderRadius="1rem" />
          <Skeleton height="2.75rem" borderRadius="1rem" />
          <Skeleton height="2.75rem" borderRadius="1rem" />
        </div>
        <Message v-else-if="timelineError" severity="warn" :closable="false">{{ timelineError }}</Message>
        <ul v-else-if="timelineEvents.length" class="timeline-list">
          <li v-for="event in timelineEvents" :key="event.key" class="timeline-event">
            <span :class="['timeline-dot', `variant-${event.variant}`]" />
            <div>
              <div class="timeline-event__label">{{ event.label }}</div>
              <small>{{ event.timestamp }}</small>
              <p v-if="event.detail">{{ event.detail }}</p>
            </div>
          </li>
        </ul>
        <Message v-else severity="info" :closable="false">No timeline activity recorded.</Message>
      </Dialog>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'
import { useIotMaintenance } from '~/composables/useIotMaintenance'
import type { IotIncident, TicketVerificationEvent } from '~/types/iotMaintenance'

type EntitySlug = 'tenants' | 'watchmen' | 'support-tickets'

interface EntityDefinition {
  label: string
  table: string
  rowKey: string
  description: string
  columns: { field: string; header: string }[]
  landlordView?: {
    source: string
    rowKey: string
    columns: { field: string; header: string }[]
  }
}

interface TicketIotBadge {
  label: string
  severity: 'info' | 'warning' | 'success' | 'danger' | 'secondary'
}

type TicketFilterKey =
  | 'all'
  | 'tenant_reported'
  | 'auto_detected'
  | 'sensor_linked'
  | 'sensor_verified'
  | 'awaiting_verification'

const entityDefinitions: Record<EntitySlug, EntityDefinition> = {
  tenants: {
    label: 'Tenants',
    table: 'tenant',
    rowKey: 'id',
    description: 'Track everyone who currently lives on the property along with their units and contacts.',
    columns: [
      { field: 'full_name', header: 'Name' },
      { field: 'unit_number', header: 'Unit' },
      { field: 'phone', header: 'Phone' },
      { field: 'watchman_display', header: 'Watchman' },
      { field: 'status', header: 'Status' }
    ],
    landlordView: {
      source: 'landlord_tenants_view',
      rowKey: 'tenant_id',
      columns: [
        { field: 'tenant_name', header: 'Tenant' },
        { field: 'building_name', header: 'Building' },
        { field: 'unit_number', header: 'Unit' },
        { field: 'phone', header: 'Phone' },
        { field: 'watchman_display', header: 'Watchman' }
      ]
    }
  },
  watchmen: {
    label: 'Watchmen',
    table: 'watchman',
    rowKey: 'id',
    description: 'Stay on top of guard schedules, shift coverage, and their contact information.',
    columns: [
      { field: 'watchman_name', header: 'Watchman Name' },
      { field: 'full_name', header: 'Name' },
      { field: 'shift', header: 'Shift' },
      { field: 'phone', header: 'Phone' },
      { field: 'status', header: 'Status' }
    ],
    landlordView: {
      source: 'landlord_watchmen_view',
      rowKey: 'watchman_id',
      columns: [
        { field: 'watchman_name', header: 'Watchman Name' },
        { field: 'building_name', header: 'Building' },
        { field: 'building_id', header: 'Building ID' }
      ]
    }
  },
  'support-tickets': {
    label: 'Support Tickets',
    table: 'support_ticket',
    rowKey: 'id',
    description: 'Review every resident request and make sure the right team is following up.',
    columns: [
      { field: 'title', header: 'Title' },
      { field: 'subject', header: 'Subject' },
      { field: 'tenant_display', header: 'Tenant' },
      { field: 'status', header: 'Status' },
      { field: 'priority', header: 'Priority' },
      { field: 'created_at', header: 'Created' }
    ],
    landlordView: {
      source: 'landlord_support_tickets_view',
      rowKey: 'support_ticket_id',
      columns: [
        { field: 'title', header: 'Title' },
        { field: 'tenant_display', header: 'Tenant' },
        { field: 'status', header: 'Status' },
        { field: 'building_name', header: 'Building' },
        { field: 'created_at', header: 'Created' }
      ]
    }
  }
}

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

const role = ref('')
const loading = ref(false)
const errorMessage = ref('')
const supabaseAccessToken = ref('')
const supabaseUserId = ref('')
const rows = ref<Record<string, unknown>[]>([])
const lastFetched = ref<Date | null>(null)
const detailDialogVisible = ref(false)
const detailRecord = ref<Record<string, unknown> | null>(null)
const timelineDialogVisible = ref(false)
const timelineTicketTitle = ref('')
const timelineTicketId = ref('')
const timelineLoading = ref(false)
const timelineError = ref('')
const timelineEvents = ref<
  { key: string; label: string; timestamp: string; detail?: string; variant: string }[]
>([])
const ticketFilter = ref<TicketFilterKey>('all')
const sensorEvidenceLoading = ref(false)
const sensorEvidenceError = ref('')
const sensorIncident = ref<IotIncident | null>(null)
const sensorVerificationEvents = ref<TicketVerificationEvent[]>([])
const { fetchTicketSensorEvidence } = useIotMaintenance()

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
const isLandlord = computed(() => role.value === 'LANDLORD')
const isWatchman = computed(() => role.value === 'WATCHMAN')
const isAllowed = computed(() => role.value === 'authenticated' || isLandlord.value || isWatchman.value)
const isSupportTicketView = computed(() => entitySlug.value === 'support-tickets')
const resolvedStatuses = ['COMPLETED', 'FIXED', 'RESOLVED', 'CLOSED', 'VERIFIED']
const ticketFilterOptions: { label: string; value: TicketFilterKey }[] = [
  { label: 'All', value: 'all' },
  { label: 'Tenant Reported', value: 'tenant_reported' },
  { label: 'Auto-detected', value: 'auto_detected' },
  { label: 'Sensor-linked', value: 'sensor_linked' },
  { label: 'Sensor Verified', value: 'sensor_verified' },
  { label: 'Awaiting Verification', value: 'awaiting_verification' }
]

const columnHints = computed(() => {
  if (!activeEntity.value) {
    return []
  }

  if (isLandlord.value && activeEntity.value.landlordView) {
    return activeEntity.value.landlordView.columns
  }

  return activeEntity.value.columns
})

const visibleColumns = computed(() => {
  if (!activeEntity.value) {
    return []
  }

  const hints = columnHints.value

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

const selectClause = computed(() => {
  const segments = ['*']

  if (entitySlug.value === 'support-tickets' && !isLandlord.value) {
    segments.push('tenant:tenant_id(full_name,watchman_id)')
  }

  return segments.join(',')
})

const tableDataKey = computed(() => {
  if (!activeEntity.value) {
    return 'id'
  }

  if (isLandlord.value && activeEntity.value.landlordView) {
    return activeEntity.value.landlordView.rowKey
  }

  return activeEntity.value.rowKey
})

const activeSource = computed(() => {
  if (!activeEntity.value) {
    return null
  }

  if (isLandlord.value && activeEntity.value.landlordView) {
    return {
      endpoint: activeEntity.value.landlordView.source,
      query: {
        select: selectClause.value,
        landlord_user_id: `eq.${supabaseUserId.value}`
      }
    }
  }

  return {
    endpoint: activeEntity.value.table,
    query: {
      select: selectClause.value
    }
  }
})

const lastSyncedText = computed(() => {
  if (!lastFetched.value) {
    return '--'
  }

  return lastFetched.value.toLocaleString()
})

const detailDialogTitle = computed(() => {
  if (!detailRecord.value || !activeEntity.value) {
    return 'Record details'
  }

  return `${activeEntity.value.label} Details`
})

const timelineVariantMap: Record<string, string> = {
  VIEWED: 'muted',
  IN_PROGRESS: 'info',
  FIXED: 'warning',
  COMPLETED: 'success',
  VERIFIED: 'success'
}

const formatTimelineTimestamp = (value?: string) => {
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

const formatEventLabel = (eventType: string) => {
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

const parseEventMetadata = (value: unknown) => {
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

const isoDatePattern = /^\d{4}-\d{2}-\d{2}/

const isLikelyIsoDate = (value: string) => isoDatePattern.test(value) && !Number.isNaN(Date.parse(value))

const humanizeDate = (value: string) => {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const shouldFormatAsDate = (value: string, field?: string) => {
  if (field && field.endsWith('_at')) {
    return true
  }

  return isLikelyIsoDate(value)
}

const formatCell = (value: unknown, field?: string) => {
  if (value === null || value === undefined) {
    return '--'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const textValue = String(value)

    if (typeof value === 'string' && shouldFormatAsDate(value, field)) {
      return humanizeDate(value)
    }

    if (typeof value === 'number' && field && field.endsWith('_at')) {
      return humanizeDate(new Date(value).toISOString())
    }

    return textValue
  }

  return JSON.stringify(value)
}

const prettifyField = (field: string) =>
  field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())

const detailEntries = computed(() => {
  if (!detailRecord.value) {
    return []
  }

  return Object.entries(detailRecord.value).map(([key, value]) => ({
    key,
    label: prettifyField(key),
    value: formatCell(value, key)
  }))
})

const getUpdatedTooltip = (record: Record<string, unknown>) => {
  const updated = (record as { updated_at?: unknown }).updated_at

  if (!updated) {
    return 'Not updated yet'
  }

  return `Updated ${formatCell(updated, 'updated_at')}`
}

const getRecordText = (record: Record<string, unknown>, field: string, fallback = '--') => {
  const value = record[field]

  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'string') {
    return value
  }

  return String(value)
}

const isTicketOverdue = (record: Record<string, unknown>) => {
  if (!isSupportTicketView.value) {
    return false
  }

  const status = String((record as { status?: unknown }).status || '').toUpperCase()

  if (resolvedStatuses.includes(status)) {
    return false
  }

  const created = (record as { created_at?: unknown }).created_at

  if (!created || typeof created !== 'string') {
    return false
  }

  const createdDate = new Date(created)

  if (Number.isNaN(createdDate.getTime())) {
    return false
  }

  const ageMs = Date.now() - createdDate.getTime()
  const seventyTwoHoursMs = 72 * 60 * 60 * 1000

  return ageMs > seventyTwoHoursMs
}

const getRowClass = (record: Record<string, unknown>) => {
  if (isTicketOverdue(record)) {
    return 'overdue-row'
  }

  return ''
}

const formatDuration = (ms: number) => {
  const totalMinutes = Math.floor(ms / (60 * 1000))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

const getDelayText = (record: Record<string, unknown>) => {
  if (!isTicketOverdue(record)) {
    return ''
  }

  const created = (record as { created_at?: string }).created_at

  if (!created) {
    return ''
  }

  const createdDate = new Date(created)

  if (Number.isNaN(createdDate.getTime())) {
    return ''
  }

  const delayMs = Date.now() - createdDate.getTime()

  return `${formatDuration(delayMs)} overdue`
}

const ticketDetail = computed(() => {
  if (!isSupportTicketView.value || !detailRecord.value) {
    return null
  }

  const record = detailRecord.value

  return {
    title: getRecordText(record, 'title'),
    subject: getRecordText(record, 'subject'),
    description: getRecordText(record, 'description'),
    tenant: getRecordText(record, 'tenant_display'),
    watchman: getRecordText(record, 'watchman_display'),
    status: getRecordText(record, 'status'),
    priority: getRecordText(record, 'priority'),
    source: getRecordText(record, 'source'),
    linkedIncident: getRecordText(record, 'linked_iot_incident_id'),
    verificationStatus: getRecordText(record, 'verification_status'),
    created: formatCell(record.created_at, 'created_at'),
    updated: formatCell(record.updated_at, 'updated_at'),
    delay: getDelayText(record),
    building: getRecordText(record, 'building_name'),
    ticketId: getRecordText(record, 'id') !== '--' ? getRecordText(record, 'id') : getRecordText(record, 'support_ticket_id')
  }
})

const filteredRows = computed(() => {
  if (!isSupportTicketView.value) {
    return rows.value
  }

  const matches = (row: Record<string, unknown>) => {
    const source = String(row.source || '').toUpperCase()
    const linkedIncident = row.linked_iot_incident_id
    const verification = String(row.verification_status || '').toUpperCase()

    switch (ticketFilter.value) {
      case 'tenant_reported':
        return source !== 'IOT_AUTO'
      case 'auto_detected':
        return source === 'IOT_AUTO'
      case 'sensor_linked':
        return Boolean(linkedIncident)
      case 'sensor_verified':
        return verification === 'SUPPORTED'
      case 'awaiting_verification':
        return verification === 'PENDING'
      default:
        return true
    }
  }

  return rows.value.filter(matches)
})

const latestVerificationEvent = computed(() => sensorVerificationEvents.value[0] || null)

const latestEvidenceSummary = computed(() => latestVerificationEvent.value?.evidence_summary || '--')

const incidentDeviceName = computed(() => sensorIncident.value?.iot_device?.device_name || sensorIncident.value?.iot_device?.sensor_code || '--')

const incidentDeviceLocation = computed(() => sensorIncident.value?.iot_device?.location_label || '--')

const incidentGatewayName = computed(
  () => sensorIncident.value?.iot_device?.iot_gateway?.gateway_code || sensorIncident.value?.iot_device?.iot_gateway?.location_label || '--'
)

const ticketSensorEvidenceVisible = computed(() => {
  if (!ticketDetail.value) {
    return false
  }

  const linkedIncident = ticketDetail.value.linkedIncident && ticketDetail.value.linkedIncident !== '--'
  const verStatus = ticketDetail.value.verificationStatus && ticketDetail.value.verificationStatus !== 'NOT_APPLICABLE' && ticketDetail.value.verificationStatus !== '--'

  return linkedIncident || verStatus || sensorVerificationEvents.value.length > 0
})

const formatSourceLabel = (value?: string) => {
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

const formatVerificationLabel = (value?: string) => {
  switch ((value || '').toUpperCase()) {
    case 'SUPPORTED':
      return 'Verified by sensor'
    case 'PENDING':
      return 'Awaiting sensor verification'
    case 'FAILED':
      return 'Sensor verification failed'
    case 'EXPIRED':
      return 'Verification expired'
    default:
      return value || '--'
  }
}

const verificationSeverity = (value?: string) => {
  switch ((value || '').toUpperCase()) {
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

const formatIncidentType = (value?: string | null) => {
  if (!value) {
    return '--'
  }

  if (value.toUpperCase() === 'WATER_LEAK_DETECTED') {
    return 'Water leak detected'
  }

  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
}

const getTicketIotBadges = (record: Record<string, unknown>): TicketIotBadge[] => {
  const badges: TicketIotBadge[] = []
  const source = String(record.source || '').toUpperCase()
  const linkedIncident = record.linked_iot_incident_id
  const verification = String(record.verification_status || '').toUpperCase()

  if (source === 'IOT_AUTO') {
    badges.push({ label: 'Auto-detected', severity: 'info' })
  }

  if (linkedIncident) {
    badges.push({ label: 'Sensor-linked', severity: 'warning' })
  }

  if (verification === 'SUPPORTED') {
    badges.push({ label: 'Verified by sensor', severity: 'success' })
  } else if (verification === 'PENDING') {
    badges.push({ label: 'Awaiting verification', severity: 'warning' })
  } else if (verification === 'FAILED') {
    badges.push({ label: 'Verification failed', severity: 'danger' })
  }

  return badges
}

const getTicketIotMetaLine = (record: Record<string, unknown>) => {
  const parts: string[] = []
  const location = String(record.iot_location_label || '').trim()
  const severity = String(record.iot_severity || '').trim()
  const verification = String(record.verification_status || '').trim()

  if (location) {
    parts.push(location)
  }
  if (severity) {
    parts.push(`Severity: ${severity}`)
  }
  if (verification) {
    parts.push(`Verification: ${formatVerificationLabel(verification)}`)
  }

  return parts.join(' · ')
}

const normalizeTenantRows = (data: Record<string, unknown>[]) =>
  data.map((row) => {
    const normalized = { ...row }
    const watchmanName =
      (normalized as { watchman_display?: unknown }).watchman_display ||
      (normalized as { watchman_name?: unknown }).watchman_name ||
      (normalized as { watchman_id?: unknown }).watchman_id ||
      '--'

    normalized.watchman_display = watchmanName

    return normalized
  })

const normalizeSupportTicketRows = (data: Record<string, unknown>[]) =>
  data.map((row) => {
    const normalized = { ...row }

    if (isLandlord.value) {
      normalized.tenant_display =
        (normalized as { tenant_display?: unknown }).tenant_display ||
        (normalized as { tenant_name?: unknown }).tenant_name ||
        '--'

      normalized.watchman_display =
        (normalized as { watchman_display?: unknown }).watchman_display ||
        (normalized as { watchman_name?: unknown }).watchman_name ||
        '--'
    } else {
      const tenantRelation = (normalized as {
        tenant?: { full_name?: string; watchman_id?: string | number }
      }).tenant

      normalized.tenant_display =
        (normalized as { tenant_display?: unknown }).tenant_display ||
        tenantRelation?.full_name ||
        '--'

      normalized.watchman_display =
        (normalized as { watchman_display?: unknown }).watchman_display ||
        (normalized as { watchman_name?: unknown }).watchman_name ||
        '--'

      if ('tenant' in normalized) {
        delete (normalized as Record<string, unknown>).tenant
      }
    }

    return normalized
  })

const normalizeRows = (data: Record<string, unknown>[]) => {
  if (!activeEntity.value) {
    return data
  }

  if (entitySlug.value === 'tenants') {
    return normalizeTenantRows(data)
  }

  if (entitySlug.value === 'support-tickets') {
    return normalizeSupportTicketRows(data)
  }

  return data
}

const buildInFilter = (values: (string | number)[]) => {
  const tokens = values.map((value) => {
    if (typeof value === 'number') {
      return String(value)
    }

    return `"${value}"`
  })

  return `in.(${tokens.join(',')})`
}

const fetchWatchmanNames = async (ids: (string | number)[]) => {
  if (!ids.length) {
    return {}
  }

  try {
    const records = await $fetch<{ id: string | number; full_name?: string }[]>(`${supabaseUrl}/rest/v1/watchman`, {
      method: 'GET',
      query: {
        select: 'id,full_name',
        id: buildInFilter(ids)
      },
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAccessToken.value}`,
        Range: '0-99',
        'Range-Unit': 'items'
      }
    })

    return (records || []).reduce<Record<string | number, string>>((map, item) => {
      if (item.id) {
        map[item.id] = item.full_name || ''
      }

      return map
    }, {})
  } catch (error) {
    console.warn('Unable to fetch watchman names', error)

    return {}
  }
}

const enrichTenantRows = async (data: Record<string, unknown>[]) => {
  if (!data.length) {
    return data
  }

  const watchmanIds = Array.from(
    new Set(
      data
        .map((row) => (row as { watchman_id?: string | number }).watchman_id)
        .filter((value): value is string | number => Boolean(value))
    )
  )

  if (!watchmanIds.length) {
    return data
  }

  const watchmanMap = await fetchWatchmanNames(watchmanIds)

  return data.map((row) => {
    const watchmanId = (row as { watchman_id?: string | number }).watchman_id

    if (watchmanId && !('watchman_name' in row)) {
      const name = watchmanMap[watchmanId]

      if (name) {
        return {
          ...row,
          watchman_name: name
        }
      }
    }

    return row
  })
}

const extractSupportTicketWatchmanIds = (rows: Record<string, unknown>[]) =>
  Array.from(
    new Set(
      rows
        .map((row) => {
          const directId = (row as { watchman_id?: string | number }).watchman_id
          const nestedTenant = (row as { tenant?: { watchman_id?: string | number } }).tenant

          return directId ?? nestedTenant?.watchman_id ?? null
        })
        .filter((value): value is string | number => Boolean(value))
    )
  )

const enrichSupportTicketRows = async (rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    return rows
  }

  const watchmanIds = extractSupportTicketWatchmanIds(rows)

  if (!watchmanIds.length) {
    return rows
  }

  const watchmanMap = await fetchWatchmanNames(watchmanIds)

  const ticketIds = Array.from(
    new Set(
      rows
        .map((row) =>
          isLandlord.value
            ? (row as { support_ticket_id?: string }).support_ticket_id
            : (row as { id?: string }).id
        )
        .filter((value): value is string => Boolean(value))
    )
  )

  let iotMetaByTicketId: Record<string, Record<string, unknown>> = {}
  let incidentById: Record<string, Record<string, unknown>> = {}

  if (ticketIds.length) {
    try {
      const ticketMetaRows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/support_ticket`, {
        method: 'GET',
        query: {
          select: 'id,source,linked_iot_incident_id,verification_status',
          id: buildInFilter(ticketIds),
          limit: 500
        },
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAccessToken.value}`
        }
      })

      iotMetaByTicketId = (ticketMetaRows || []).reduce<Record<string, Record<string, unknown>>>((acc, ticket) => {
        const id = String(ticket.id || '')
        if (id) {
          acc[id] = ticket
        }
        return acc
      }, {})
    } catch {
      iotMetaByTicketId = {}
    }
  }

  const incidentIds = Array.from(
    new Set(Object.values(iotMetaByTicketId).map((item) => String(item.linked_iot_incident_id || '')).filter(Boolean))
  )

  if (incidentIds.length) {
    try {
      const incidentRows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_incident`, {
        method: 'GET',
        query: {
          select: 'id,severity,iot_device(location_label)',
          id: buildInFilter(incidentIds),
          limit: 500
        },
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAccessToken.value}`
        }
      })

      incidentById = (incidentRows || []).reduce<Record<string, Record<string, unknown>>>((acc, incident) => {
        const id = String(incident.id || '')
        if (id) {
          acc[id] = incident
        }
        return acc
      }, {})
    } catch {
      incidentById = {}
    }
  }

  return rows.map((row) => {
    const directId = (row as { watchman_id?: string | number }).watchman_id
    const tenantWatchmanId = (row as { tenant?: { watchman_id?: string | number } }).tenant?.watchman_id
    const lookupId = directId ?? tenantWatchmanId

    const ticketId = isLandlord.value
      ? String((row as { support_ticket_id?: string }).support_ticket_id || '')
      : String((row as { id?: string }).id || '')

    const enriched: Record<string, unknown> = {
      ...row
    }

    if (lookupId && watchmanMap[lookupId]) {
      enriched.watchman_name = watchmanMap[lookupId]
    }

    if (ticketId && iotMetaByTicketId[ticketId]) {
      enriched.source = iotMetaByTicketId[ticketId].source
      enriched.linked_iot_incident_id = iotMetaByTicketId[ticketId].linked_iot_incident_id
      enriched.verification_status = iotMetaByTicketId[ticketId].verification_status

      const linkedIncidentId = String(iotMetaByTicketId[ticketId].linked_iot_incident_id || '')
      const linkedIncident = linkedIncidentId ? incidentById[linkedIncidentId] : null
      if (linkedIncident) {
        enriched.iot_severity = linkedIncident.severity
        enriched.iot_location_label = (linkedIncident.iot_device as { location_label?: string } | undefined)?.location_label || ''
      }
    }

    return enriched
  })
}

const loadTicketSensorEvidence = async (record: Record<string, unknown>) => {
  if (!isSupportTicketView.value) {
    return
  }

  const ticketId = String(
    isLandlord.value
      ? (record as { support_ticket_id?: string }).support_ticket_id || ''
      : (record as { id?: string }).id || ''
  )

  if (!ticketId) {
    return
  }

  sensorEvidenceLoading.value = true
  sensorEvidenceError.value = ''
  sensorIncident.value = null
  sensorVerificationEvents.value = []

  const linkedIncidentId = (record as { linked_iot_incident_id?: string }).linked_iot_incident_id || null
  const result = await fetchTicketSensorEvidence(supabaseAccessToken.value, ticketId, linkedIncidentId)

  if (result.error || !result.data) {
    sensorEvidenceError.value = result.error || 'Unable to load sensor evidence.'
    sensorEvidenceLoading.value = false
    return
  }

  sensorIncident.value = result.data.incident
  sensorVerificationEvents.value = result.data.verificationEvents
  sensorEvidenceLoading.value = false
}

const openRecordDetail = async (record: Record<string, unknown>) => {
  detailRecord.value = record
  detailDialogVisible.value = true

  if (isSupportTicketView.value) {
    await loadTicketSensorEvidence(record)
  } else {
    sensorIncident.value = null
    sensorVerificationEvents.value = []
    sensorEvidenceError.value = ''
  }
}

const supportTicketIdField = computed(() => {
  if (!isSupportTicketView.value) {
    return 'id'
  }

  if (isLandlord.value && activeEntity.value?.landlordView) {
    return 'support_ticket_id'
  }

  return 'id'
})

const openTimelineDialog = async (record: Record<string, unknown>) => {
  if (!isSupportTicketView.value) {
    return
  }

  const idField = supportTicketIdField.value
  const ticketId = (record as Record<string, unknown>)[idField]

  if (!ticketId || typeof ticketId !== 'string') {
    timelineError.value = 'Ticket id is missing.'
    timelineEvents.value = []
    timelineDialogVisible.value = true

    return
  }

  timelineTicketId.value = ticketId
  timelineTicketTitle.value = (record as { title?: string; subject?: string }).title || (record as { subject?: string }).subject || 'Support Ticket'
  timelineDialogVisible.value = true
  await loadTicketTimeline(ticketId)
}

const loadRows = async () => {
  if (!activeEntity.value) {
    errorMessage.value = 'Unknown list.'
    return
  }

  if (isLandlord.value && !supabaseUserId.value) {
    errorMessage.value = 'Unable to determine landlord scope. Please sign in again.'
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

  const source = activeSource.value

  if (!source) {
    errorMessage.value = 'Unknown list.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    let data = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/${source.endpoint}`, {
      method: 'GET',
      query: source.query,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAccessToken.value}`,
        Range: '0-49',
        'Range-Unit': 'items'
      }
    })

    data = data || []

    if (entitySlug.value === 'tenants') {
      data = await enrichTenantRows(data)
    }

    if (entitySlug.value === 'support-tickets') {
      data = await enrichSupportTicketRows(data)
    }

    rows.value = normalizeRows(data)
    lastFetched.value = new Date()
  } catch (error) {
    const err = error as { data?: { message?: string; error_description?: string } }
    errorMessage.value = err?.data?.message ?? err?.data?.error_description ?? 'Unable to load records.'
  } finally {
    loading.value = false
  }
}

const loadTicketTimeline = async (ticketId: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    timelineError.value = 'Supabase configuration is missing.'
    return
  }

  if (!supabaseAccessToken.value) {
    timelineError.value = 'You are not signed in.'
    return
  }

  timelineLoading.value = true
  timelineError.value = ''

  try {
    const events = await $fetch<{ id: string; event_type: string; created_at: string; metadata?: Record<string, unknown> | string | null }[]>(
      `${supabaseUrl}/rest/v1/support_ticket_events`,
      {
        method: 'GET',
        query: {
          select: 'id,event_type,created_at,metadata',
          ticket_id: `eq.${ticketId}`,
          order: 'created_at.asc'
        },
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAccessToken.value}`,
          Range: '0-99',
          'Range-Unit': 'items'
        }
      }
    )

    if (!events?.length) {
      timelineEvents.value = []
      timelineError.value = 'No timeline activity for this ticket yet.'
      return
    }

    timelineEvents.value = events.map((event, index) => {
      const metadata = parseEventMetadata(event.metadata)
      let detail: string | undefined

      if (metadata && 'from' in metadata && 'to' in metadata) {
        const fromValue = metadata.from as string
        const toValue = metadata.to as string
        detail = `Status changed: ${fromValue} -> ${toValue}`
      }

      return {
        key: `${event.id}-${index}`,
        label: formatEventLabel(event.event_type),
        timestamp: formatTimelineTimestamp(event.created_at),
        detail,
        variant: timelineVariantMap[event.event_type] || 'muted'
      }
    })
  } catch (error) {
    const err = error as { data?: { message?: string; error_description?: string } }
    timelineError.value = err?.data?.message ?? err?.data?.error_description ?? 'Unable to load ticket timeline.'
    timelineEvents.value = []
  } finally {
    timelineLoading.value = false
  }
}

const hydrateSession = () => {
  if (!process.client) {
    return
  }

  supabaseAccessToken.value = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
  supabaseUserId.value = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''
}

onMounted(async () => {
  hydrateSession()

  if (entitySlug.value === 'support-tickets') {
    await navigateTo('/tickets')
    return
  }

  if (supabaseAccessToken.value && isAllowed.value && activeEntity.value) {
    await loadRows()
  }
})

watch(
  () => route.params.entity,
  async () => {
    if (entitySlug.value === 'support-tickets') {
      await navigateTo('/tickets')
      return
    }

    ticketFilter.value = 'all'
    rows.value = []
    errorMessage.value = ''
    lastFetched.value = null

    if (supabaseAccessToken.value && isAllowed.value && activeEntity.value) {
      await loadRows()
    }
  }
)

watch(
  () => [supabaseAccessToken.value, isAllowed.value, supabaseUserId.value],
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
  background: var(--color-soft-linen-300);
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
  background: var(--color-carbon-black-900);
  color: var(--color-soft-linen-50);
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

.ticket-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.75rem;
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

.detail-dialog :deep(.p-dialog-header) {
  font-weight: 700;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px dashed #e2e8f0;
}

.detail-label {
  font-weight: 600;
  color: #1e293b;
}

.detail-value {
  color: #475569;
  text-align: right;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.ticket-title-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ticket-iot-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.iot-badge {
  font-size: 0.72rem;
}

.ticket-iot-meta {
  color: #64748b;
  font-size: 0.78rem;
}

.timeline-dialog :deep(.p-dialog-header) {
  font-weight: 700;
}

.timeline-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.timeline-event {
  display: flex;
  gap: 0.75rem;
}

.timeline-dot {
  width: 14px;
  height: 14px;
  margin-top: 4px;
  border-radius: 50%;
  background: #cbd5f5;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.25);
}

.timeline-dot.variant-muted {
  background: #94a3b8;
}

.timeline-dot.variant-info {
  background: #3b82f6;
}

.timeline-dot.variant-warning {
  background: #f59e0b;
}

.timeline-dot.variant-success {
  background: #22c55e;
}

.timeline-event__label {
  font-weight: 600;
  margin-bottom: 0.1rem;
  color: #0f172a;
}

.timeline-event small {
  display: block;
  color: #64748b;
  margin-bottom: 0.2rem;
}

.timeline-event p {
  margin: 0;
  color: #475569;
}

.created-cell {
  cursor: help;
  border-bottom: 1px dotted rgba(15, 23, 42, 0.4);
  font-size: 0.85rem;
}

.status-tag {
  font-size: 0.85rem;
}

.overdue-delay {
  display: block;
  margin-top: 0.15rem;
  color: #b91c1c;
  font-size: 0.78rem;
  font-weight: 600;
}

.entity-table :deep(.overdue-row) {
  background: rgba(248, 113, 113, 0.08);
}

.entity-table :deep(.overdue-row:hover) {
  background: rgba(248, 113, 113, 0.18);
}

.ticket-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ticket-dialog__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #1d4ed8, #9333ea);
  color: #fff;
}

.ticket-dialog__header h3 {
  margin: 0.25rem 0 0.15rem;
  font-size: 1.4rem;
}

.ticket-dialog__header p {
  margin: 0;
  opacity: 0.9;
}

.ticket-priority-tag {
  margin-left: 0.5rem;
}

.ticket-dialog__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.meta-label {
  display: block;
  opacity: 0.75;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.delay-chip {
  color: #fee2e2;
}

.ticket-dialog__body {
  padding: 1rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ticket-dialog__description {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  min-height: 64px;
  color: #0f172a;
}

.ticket-dialog__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
}

.sensor-evidence {
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 0.8rem;
  background: #fff;
}

.sensor-evidence__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.sensor-evidence__header h4 {
  margin: 0;
  color: #0f172a;
}

.sensor-evidence__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
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
