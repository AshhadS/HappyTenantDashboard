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
                :dataKey="tableDataKey"
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
                    <span
                      v-if="column.field === 'created_at'"
                      class="created-cell"
                      :title="getUpdatedTooltip(data)"
                    >
                      {{ formatCell(data[column.field], column.field) }}
                    </span>
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

              <Message v-else severity="info" :closable="false">No records exist yet. Try refreshing later.</Message>
            </template>
          </div>
        </template>
      </Card>

      <Dialog
        v-model:visible="detailDialogVisible"
        modal
        :header="detailDialogTitle"
        class="detail-dialog"
        :style="{ width: 'min(520px, 92vw)' }"
      >
        <div v-if="detailEntries.length" class="detail-grid">
          <div v-for="item in detailEntries" :key="item.key" class="detail-row">
            <span class="detail-label">{{ item.label }}</span>
            <span class="detail-value">{{ item.value }}</span>
          </div>
        </div>
        <Message v-else severity="info" :closable="false">No details available.</Message>
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
      { field: 'watchman_display', header: 'Watchman' },
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
        { field: 'watchman_display', header: 'Watchman' },
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
const isAllowed = computed(() => role.value === 'authenticated' || isLandlord.value)
const isSupportTicketView = computed(() => entitySlug.value === 'support-tickets')

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

  if (entitySlug.value === 'tenants' && !isLandlord.value) {
    segments.push('watchman:watchman_id(full_name)')
  }

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

const normalizeTenantRows = (data: Record<string, unknown>[]) =>
  data.map((row) => {
    const normalized = { ...row }
    const watchmanRelation = (normalized as { watchman?: { full_name?: string } }).watchman
    const watchmanName =
      (normalized as { watchman_display?: unknown }).watchman_display ||
      (normalized as { watchman_name?: unknown }).watchman_name ||
      watchmanRelation?.full_name ||
      (normalized as { watchman_id?: unknown }).watchman_id ||
      '--'

    normalized.watchman_display = watchmanName

    if ('watchman' in normalized) {
      delete (normalized as Record<string, unknown>).watchman
    }

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

const enrichLandlordTenantRows = async (data: Record<string, unknown>[]) => {
  if (!isLandlord.value || !data.length) {
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

  return rows.map((row) => {
    const directId = (row as { watchman_id?: string | number }).watchman_id
    const tenantWatchmanId = (row as { tenant?: { watchman_id?: string | number } }).tenant?.watchman_id
    const lookupId = directId ?? tenantWatchmanId

    if (lookupId && watchmanMap[lookupId]) {
      return {
        ...row,
        watchman_name: watchmanMap[lookupId]
      }
    }

    return row
  })
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

    if (entitySlug.value === 'tenants' && isLandlord.value) {
      data = await enrichLandlordTenantRows(data)
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

const openRecordDetail = (record: Record<string, unknown>) => {
  detailRecord.value = record
  detailDialogVisible.value = true
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
