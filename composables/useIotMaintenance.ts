import type { IotDevice, IotIncident, IotOverview, TicketSensorEvidencePayload, TicketVerificationEvent } from '~/types/iotMaintenance'

interface SupabaseApiError {
  message?: string
  error_description?: string
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const asString = (value: unknown) => (value == null ? null : String(value))

const asObject = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

const buildHeaders = (anonKey: string, accessToken: string) => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken || anonKey}`
})

const buildInFilter = (values: string[]) => {
  if (!values.length) {
    return ''
  }

  return `in.(${values.map((value) => `"${value}"`).join(',')})`
}

const normalizeGateway = (row: Record<string, unknown>) => ({
  id: String(row.id || ''),
  gateway_code: asString(row.gateway_code),
  building_id: asString(row.building_id),
  location_label: asString(row.location_label),
  status: asString(row.status),
  last_seen_at: asString(row.last_seen_at),
  created_at: asString(row.created_at)
})

const normalizeDevice = (row: Record<string, unknown>): IotDevice => ({
  id: String(row.id || ''),
  gateway_id: asString(row.gateway_id),
  sensor_code: asString(row.sensor_code),
  building_id: asString(row.building_id),
  device_name: asString(row.device_name),
  device_type: asString(row.device_type),
  location_label: asString(row.location_label),
  pin_number: row.pin_number == null ? null : toNumber(row.pin_number),
  status: asString(row.status),
  last_seen_at: asString(row.last_seen_at),
  created_at: asString(row.created_at),
  iot_gateway: row.iot_gateway ? normalizeGateway(row.iot_gateway as Record<string, unknown>) : null
})

const normalizeIncident = (row: Record<string, unknown>): IotIncident => ({
  id: String(row.id || ''),
  building_id: asString(row.building_id),
  gateway_id: asString(row.gateway_id),
  device_id: asString(row.device_id),
  incident_type: asString(row.incident_type),
  severity: asString(row.severity),
  status: asString(row.status),
  confidence_score: row.confidence_score == null ? null : toNumber(row.confidence_score),
  linked_ticket_id: asString(row.linked_ticket_id),
  started_at: asString(row.started_at),
  ended_at: asString(row.ended_at),
  iot_device: row.iot_device ? normalizeDevice(row.iot_device as Record<string, unknown>) : null,
  iot_gateway: row.iot_gateway
    ? normalizeGateway(row.iot_gateway as Record<string, unknown>)
    : row.iot_device && (row.iot_device as Record<string, unknown>).iot_gateway
      ? normalizeGateway((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>)
      : null
})

const normalizeVerificationEvent = (row: Record<string, unknown>): TicketVerificationEvent => ({
  id: String(row.id || ''),
  ticket_id: String(row.ticket_id || ''),
  device_id: asString(row.device_id),
  verification_type: asString(row.verification_type),
  verification_status: asString(row.verification_status),
  evidence_summary: asString(row.evidence_summary),
  evidence_data: asObject(row.evidence_data),
  confidence_score: row.confidence_score == null ? null : toNumber(row.confidence_score),
  verified_at: asString(row.verified_at),
  created_at: asString(row.created_at),
  iot_device: row.iot_device ? normalizeDevice(row.iot_device as Record<string, unknown>) : null
})

export const useIotMaintenance = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  const getConfigError = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
    }

    return null
  }

  const fetchScopedBuildingIds = async (accessToken: string, landlordUserId?: string) => {
    if (!landlordUserId) {
      return [] as string[]
    }

    const rows = await $fetch<{ building_id: string | null }[]>(`${supabaseUrl}/rest/v1/landlord_watchmen_view`, {
      method: 'GET',
      query: {
        select: 'building_id',
        landlord_user_id: `eq.${landlordUserId}`,
        limit: 1000
      },
      headers: buildHeaders(supabaseAnonKey, accessToken)
    })

    return Array.from(new Set((rows || []).map((row) => String(row.building_id || '')).filter(Boolean)))
  }

  const fetchDevices = async (
    accessToken: string,
    landlordUserId?: string
  ): Promise<{ data: IotDevice[]; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: [], error: configError }
    }

    try {
      const buildingIds = await fetchScopedBuildingIds(accessToken, landlordUserId)
      if (landlordUserId && !buildingIds.length) {
        return { data: [], error: null }
      }

      const rows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_device`, {
        method: 'GET',
        query: {
          select: '*,iot_gateway(*)',
          ...(buildingIds.length ? { building_id: buildInFilter(buildingIds) } : {}),
          order: 'created_at.desc',
          limit: 500
        },
        headers: buildHeaders(supabaseAnonKey, accessToken)
      })

      return { data: (rows || []).map(normalizeDevice), error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return { data: [], error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load IoT devices.' }
    }
  }

  const fetchIncidents = async (
    accessToken: string,
    landlordUserId?: string
  ): Promise<{ data: IotIncident[]; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: [], error: configError }
    }

    try {
      const buildingIds = await fetchScopedBuildingIds(accessToken, landlordUserId)
      if (landlordUserId && !buildingIds.length) {
        return { data: [], error: null }
      }

      const rows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_incident`, {
        method: 'GET',
        query: {
          // iot_incident has no direct FK to iot_gateway in this schema; load gateway through iot_device.
          select: '*,iot_device(*,iot_gateway(*))',
          ...(buildingIds.length ? { building_id: buildInFilter(buildingIds) } : {}),
          order: 'started_at.desc',
          limit: 500
        },
        headers: buildHeaders(supabaseAnonKey, accessToken)
      })

      return { data: (rows || []).map(normalizeIncident), error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return { data: [], error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load IoT incidents.' }
    }
  }

  const fetchOverview = async (
    accessToken: string,
    landlordUserId?: string
  ): Promise<{ data: IotOverview | null; error: string | null }> => {
    const [deviceResult, incidentResult] = await Promise.all([
      fetchDevices(accessToken, landlordUserId),
      fetchIncidents(accessToken, landlordUserId)
    ])

    if (deviceResult.error || incidentResult.error) {
      return {
        data: null,
        error: deviceResult.error || incidentResult.error || 'Unable to load IoT overview.'
      }
    }

    const incidents = incidentResult.data
    const linkedTicketIds = Array.from(new Set(incidents.map((item) => item.linked_ticket_id).filter(Boolean))) as string[]

    let autoDetectedTickets = linkedTicketIds.length
    let sensorVerifiedRepairs = 0

    if (linkedTicketIds.length) {
      try {
        const autoRows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/support_ticket`, {
          method: 'GET',
          query: {
            select: 'id',
            source: 'eq.IOT_AUTO',
            id: buildInFilter(linkedTicketIds),
            limit: 500
          },
          headers: buildHeaders(supabaseAnonKey, accessToken)
        })
        autoDetectedTickets = (autoRows || []).length
      } catch {
        autoDetectedTickets = linkedTicketIds.length
      }

      try {
        const verificationRows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/ticket_verification_event`, {
          method: 'GET',
          query: {
            select: 'id',
            verification_status: 'eq.SUPPORTED',
            ticket_id: buildInFilter(linkedTicketIds),
            limit: 500
          },
          headers: buildHeaders(supabaseAnonKey, accessToken)
        })
        sensorVerifiedRepairs = (verificationRows || []).length
      } catch {
        sensorVerifiedRepairs = 0
      }
    }

    const data: IotOverview = {
      activeSensorAlerts: incidents.filter((incident) => ['OPEN', 'LINKED_TO_TICKET'].includes((incident.status || '').toUpperCase())).length,
      totalSensors: deviceResult.data.length,
      offlineSensors: deviceResult.data.filter((device) => (device.status || '').toUpperCase() === 'OFFLINE').length,
      autoDetectedTickets,
      sensorVerifiedRepairs,
      openIotIncidents: incidents.filter((incident) => (incident.status || '').toUpperCase() === 'OPEN').length
    }

    return { data, error: null }
  }

  const fetchTicketSensorEvidence = async (
    accessToken: string,
    ticketId: string,
    linkedIotIncidentId?: string | null
  ): Promise<{ data: TicketSensorEvidencePayload | null; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: null, error: configError }
    }

    if (!ticketId) {
      return { data: null, error: 'Ticket id is required.' }
    }

    try {
      const headers = buildHeaders(supabaseAnonKey, accessToken)

      const [incidentRows, verificationRows] = await Promise.all([
        linkedIotIncidentId
          ? $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_incident`, {
              method: 'GET',
              query: {
                select: '*,iot_device(*)',
                id: `eq.${linkedIotIncidentId}`,
                limit: 1
              },
              headers
            })
          : Promise.resolve([]),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/ticket_verification_event`, {
          method: 'GET',
          query: {
            select: '*,iot_device(*)',
            ticket_id: `eq.${ticketId}`,
            order: 'created_at.desc',
            limit: 20
          },
          headers
        })
      ])

      return {
        data: {
          incident: incidentRows?.[0] ? normalizeIncident(incidentRows[0]) : null,
          verificationEvents: (verificationRows || []).map(normalizeVerificationEvent)
        },
        error: null
      }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: null,
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load sensor evidence.'
      }
    }
  }

  const emulateLeakEvent = async (
    accessToken: string,
    payload: {
      device_id: string
      gateway_id: string
      building_id: string
    }
  ): Promise<{ error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { error: configError }
    }

    try {
      const headers = buildHeaders(supabaseAnonKey, accessToken)

      await $fetch(`${supabaseUrl}/rest/v1/iot_sensor_reading`, {
        method: 'POST',
        body: {
          device_id: payload.device_id,
          gateway_id: payload.gateway_id,
          building_id: payload.building_id,
          reading_type: 'leak_detected',
          reading_value: 'true',
          reading_unit: 'boolean',
          raw_payload: {
            source: 'frontend_emulator',
            message: 'Leak event triggered from portal'
          }
        },
        headers: {
          ...headers,
          Prefer: 'return=minimal'
        }
      })

      await $fetch(`${supabaseUrl}/rest/v1/rpc/process_leak_readings`, {
        method: 'POST',
        headers
      })

      return { error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to emulate leak event.'
      }
    }
  }

  return {
    fetchDevices,
    fetchIncidents,
    fetchOverview,
    fetchTicketSensorEvidence,
    emulateLeakEvent
  }
}
