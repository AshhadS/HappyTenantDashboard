import type {
  BuildingActivityItem,
  BuildingOperationsGateway,
  BuildingOperationsHubData,
  BuildingOperationsSensor,
  BuildingOperationsSummary,
  BuildingOperationsTicketDetail,
  BuildingOperationsTicketTimelineEvent,
  BuildingOperationsTicket,
  DeviceHealthPanel
} from '~/types/buildingOperations'
import type { IotIncident, TicketVerificationEvent } from '~/types/iotMaintenance'

interface SupabaseApiError {
  message?: string
  error_description?: string
}

interface AccessBuildingRow {
  building_id?: string | null
  building_name?: string | null
}

interface BuildingAccessContext {
  buildingId: string
  buildingName: string
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

const uniqueBy = <T,>(items: T[], keyFn: (item: T) => string) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyFn(item)
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

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
  iot_device: row.iot_device
    ? {
        id: String((row.iot_device as Record<string, unknown>).id || ''),
        gateway_id: asString((row.iot_device as Record<string, unknown>).gateway_id),
        sensor_code: asString((row.iot_device as Record<string, unknown>).sensor_code),
        building_id: asString((row.iot_device as Record<string, unknown>).building_id),
        device_name: asString((row.iot_device as Record<string, unknown>).device_name),
        device_type: asString((row.iot_device as Record<string, unknown>).device_type),
        location_label: asString((row.iot_device as Record<string, unknown>).location_label),
        pin_number:
          (row.iot_device as Record<string, unknown>).pin_number == null
            ? null
            : toNumber((row.iot_device as Record<string, unknown>).pin_number),
        status: asString((row.iot_device as Record<string, unknown>).status),
        last_seen_at: asString((row.iot_device as Record<string, unknown>).last_seen_at),
        created_at: asString((row.iot_device as Record<string, unknown>).created_at),
        iot_gateway: (row.iot_device as Record<string, unknown>).iot_gateway
          ? {
              id: String(((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>).id || ''),
              gateway_code: asString(((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>).gateway_code),
              building_id: asString(((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>).building_id),
              location_label: asString(((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>).location_label),
              status: asString(((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>).status),
              last_seen_at: asString(((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>).last_seen_at),
              created_at: asString(((row.iot_device as Record<string, unknown>).iot_gateway as Record<string, unknown>).created_at)
            }
          : null
      }
    : null,
  iot_gateway: null
})

const normalizeVerificationEvent = (row: Record<string, unknown>): TicketVerificationEvent => ({
  id: String(row.id || ''),
  ticket_id: String(row.ticket_id || ''),
  device_id: asString(row.device_id),
  verification_type: asString(row.verification_type),
  verification_status: asString(row.verification_status),
  evidence_summary: asString(row.evidence_summary),
  evidence_data: row.evidence_data && typeof row.evidence_data === 'object' ? (row.evidence_data as Record<string, unknown>) : null,
  confidence_score: row.confidence_score == null ? null : toNumber(row.confidence_score),
  verified_at: asString(row.verified_at),
  created_at: asString(row.created_at),
  iot_device: row.iot_device
    ? {
        id: String((row.iot_device as Record<string, unknown>).id || ''),
        gateway_id: asString((row.iot_device as Record<string, unknown>).gateway_id),
        sensor_code: asString((row.iot_device as Record<string, unknown>).sensor_code),
        building_id: asString((row.iot_device as Record<string, unknown>).building_id),
        device_name: asString((row.iot_device as Record<string, unknown>).device_name),
        device_type: asString((row.iot_device as Record<string, unknown>).device_type),
        location_label: asString((row.iot_device as Record<string, unknown>).location_label),
        pin_number:
          (row.iot_device as Record<string, unknown>).pin_number == null
            ? null
            : toNumber((row.iot_device as Record<string, unknown>).pin_number),
        status: asString((row.iot_device as Record<string, unknown>).status),
        last_seen_at: asString((row.iot_device as Record<string, unknown>).last_seen_at),
        created_at: asString((row.iot_device as Record<string, unknown>).created_at),
        iot_gateway: null
      }
    : null
})

const normalizeTimelineEvent = (row: Record<string, unknown>): BuildingOperationsTicketTimelineEvent => ({
  id: String(row.id || ''),
  eventType: String(row.event_type || ''),
  createdAt: asString(row.created_at),
  metadata: asObject(row.metadata)
})

export const useBuildingOperations = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  const getConfigError = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
    }

    return null
  }

  const fetchAccessibleBuildings = async (
    accessToken: string,
    role: string,
    userId: string
  ): Promise<{ data: BuildingAccessContext[]; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: [], error: configError }
    }

    try {
      let rows: AccessBuildingRow[] = []

      if (role === 'LANDLORD') {
        rows = await $fetch<AccessBuildingRow[]>(`${supabaseUrl}/rest/v1/landlord_watchmen_view`, {
          method: 'GET',
          query: {
            select: 'building_id,building_name',
            landlord_user_id: `eq.${userId}`,
            limit: 1000
          },
          headers: buildHeaders(supabaseAnonKey, accessToken)
        })
      } else if (role === 'WATCHMAN') {
        rows = await $fetch<AccessBuildingRow[]>(`${supabaseUrl}/rest/v1/watchman`, {
          method: 'GET',
          query: {
            select: 'building_id,building_name',
            user_id: `eq.${userId}`,
            limit: 100
          },
          headers: buildHeaders(supabaseAnonKey, accessToken)
        })
      } else {
        rows = await $fetch<AccessBuildingRow[]>(`${supabaseUrl}/rest/v1/watchman`, {
          method: 'GET',
          query: {
            select: 'building_id,building_name',
            limit: 1000
          },
          headers: buildHeaders(supabaseAnonKey, accessToken)
        })
      }

      const normalized = uniqueBy(
        (rows || [])
          .map((row) => ({
            buildingId: String(row.building_id || ''),
            buildingName: String(row.building_name || row.building_id || 'Unknown Building')
          }))
          .filter((row) => row.buildingId),
        (row) => row.buildingId
      )

      return { data: normalized, error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: [],
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load accessible buildings.'
      }
    }
  }

  const fetchBuildingSummaries = async (
    accessToken: string,
    role: string,
    userId: string
  ): Promise<{ data: BuildingOperationsSummary[]; error: string | null }> => {
    const accessResult = await fetchAccessibleBuildings(accessToken, role, userId)
    if (accessResult.error) {
      return { data: [], error: accessResult.error }
    }

    const buildings = accessResult.data
    if (!buildings.length) {
      return { data: [], error: null }
    }

    try {
      const buildingIds = buildings.map((item) => item.buildingId)
      const headers = buildHeaders(supabaseAnonKey, accessToken)

      const [devices, incidents, gateways, ticketRows] = await Promise.all([
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_device`, {
          method: 'GET',
          query: {
            select: 'id,building_id,status,last_seen_at',
            building_id: buildInFilter(buildingIds),
            limit: 1000
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_incident`, {
          method: 'GET',
          query: {
            select: 'id,building_id,status,started_at',
            building_id: buildInFilter(buildingIds),
            limit: 1000
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_gateway`, {
          method: 'GET',
          query: {
            select: 'id,building_id,status,last_seen_at',
            building_id: buildInFilter(buildingIds),
            limit: 1000
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/v_support_ticket_building`, {
          method: 'GET',
          query: {
            select: 'ticket_id,status,created_at,updated_at,building_id',
            building_id: buildInFilter(buildingIds),
            limit: 1000
          },
          headers
        })
      ])

      const summaries = buildings.map((building) => {
        const buildingDevices = (devices || []).filter((item) => String(item.building_id || '') === building.buildingId)
        const buildingIncidents = (incidents || []).filter((item) => String(item.building_id || '') === building.buildingId)
        const buildingGateways = (gateways || []).filter((item) => String(item.building_id || '') === building.buildingId)
        const buildingTickets = (ticketRows || []).filter((item) => String(item.building_id || '') === building.buildingId)

        const onlineDevices = buildingDevices.filter((device) => (String(device.status || '').toUpperCase() !== 'OFFLINE'))
        const offlineDevices = buildingDevices.filter((device) => String(device.status || '').toUpperCase() === 'OFFLINE')
        const activeIncidents = buildingIncidents.filter((incident) => {
          const status = String(incident.status || '').toUpperCase()
          return status === 'OPEN' || status === 'LINKED_TO_TICKET'
        })
        const openTickets = buildingTickets.filter((ticket) => {
          const status = String(ticket.status || '').toUpperCase()
          return !['COMPLETED', 'FIXED', 'CLOSED', 'RESOLVED', 'VERIFIED'].includes(status)
        })

        const lastActivityCandidates = [
          ...buildingDevices.map((item) => asString(item.last_seen_at)),
          ...buildingIncidents.map((item) => asString(item.started_at)),
          ...buildingGateways.map((item) => asString(item.last_seen_at)),
          ...buildingTickets.map((item) => asString(item.updated_at) || asString(item.created_at))
        ].filter(Boolean) as string[]

        const lastActivityAt = lastActivityCandidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
        const hasOnlineGateway = buildingGateways.some((gateway) => String(gateway.status || '').toUpperCase() !== 'OFFLINE')

        return {
          buildingId: building.buildingId,
          buildingName: building.buildingName,
          isOnline: hasOnlineGateway || onlineDevices.length > 0,
          openTicketsCount: openTickets.length,
          activeIncidentsCount: activeIncidents.length,
          activeSensorCount: onlineDevices.length,
          offlineDeviceCount: offlineDevices.length,
          lastActivityAt
        }
      })

      return { data: summaries, error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: [],
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load building operations summaries.'
      }
    }
  }

  const fetchBuildingOperationsHub = async (
    accessToken: string,
    role: string,
    userId: string,
    buildingId: string
  ): Promise<{ data: BuildingOperationsHubData | null; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: null, error: configError }
    }

    const accessResult = await fetchAccessibleBuildings(accessToken, role, userId)
    if (accessResult.error) {
      return { data: null, error: accessResult.error }
    }

    const buildingAccess = accessResult.data.find((item) => item.buildingId === buildingId)
    if (!buildingAccess) {
      return { data: null, error: 'You do not have access to this building.' }
    }

    try {
      const headers = buildHeaders(supabaseAnonKey, accessToken)
      const [devicesRows, gatewayRows, incidentRows, ticketLookupRows] = await Promise.all([
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_device`, {
          method: 'GET',
          query: {
            select: '*,iot_gateway(*)',
            building_id: `eq.${buildingId}`,
            order: 'created_at.desc',
            limit: 500
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_gateway`, {
          method: 'GET',
          query: {
            select: '*',
            building_id: `eq.${buildingId}`,
            order: 'created_at.desc',
            limit: 100
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_incident`, {
          method: 'GET',
          query: {
            select: '*,iot_device(*,iot_gateway(*))',
            building_id: `eq.${buildingId}`,
            order: 'started_at.desc',
            limit: 200
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/v_support_ticket_building`, {
          method: 'GET',
          query: {
            select: 'ticket_id,status,created_at,updated_at,building_id',
            building_id: `eq.${buildingId}`,
            order: 'created_at.desc',
            limit: 300
          },
          headers
        })
      ])

      const sensors: BuildingOperationsSensor[] = (devicesRows || []).map((row) => ({
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
        iot_gateway: row.iot_gateway
          ? {
              id: String((row.iot_gateway as Record<string, unknown>).id || ''),
              gateway_code: asString((row.iot_gateway as Record<string, unknown>).gateway_code),
              building_id: asString((row.iot_gateway as Record<string, unknown>).building_id),
              location_label: asString((row.iot_gateway as Record<string, unknown>).location_label),
              status: asString((row.iot_gateway as Record<string, unknown>).status),
              last_seen_at: asString((row.iot_gateway as Record<string, unknown>).last_seen_at),
              created_at: asString((row.iot_gateway as Record<string, unknown>).created_at)
            }
          : null,
        gatewayName:
          asString((row.iot_gateway as Record<string, unknown> | undefined)?.gateway_code) ||
          asString((row.iot_gateway as Record<string, unknown> | undefined)?.location_label)
      }))

      const gateways: BuildingOperationsGateway[] = (gatewayRows || []).map((row) => {
        const gatewayId = String(row.id || '')
        return {
          id: gatewayId,
          gateway_code: asString(row.gateway_code),
          building_id: asString(row.building_id),
          location_label: asString(row.location_label),
          status: asString(row.status),
          last_seen_at: asString(row.last_seen_at),
          created_at: asString(row.created_at),
          sensorsAttached: sensors.filter((sensor) => sensor.gateway_id === gatewayId).length
        }
      })

      const incidents = (incidentRows || []).map(normalizeIncident)

      const ticketIds = Array.from(new Set((ticketLookupRows || []).map((row) => String(row.ticket_id || '')).filter(Boolean)))

      const [ticketRows, verificationRows] = await Promise.all([
        ticketIds.length
          ? $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/support_ticket`, {
              method: 'GET',
              query: {
                select: 'id,title,description,status,created_at,updated_at,source,linked_iot_incident_id,verification_status,tenant:tenant_id(id,full_name,unit_number,watchman_id)',
                id: buildInFilter(ticketIds),
                order: 'created_at.desc',
                limit: 300
              },
              headers
            })
          : Promise.resolve([]),
        ticketIds.length
          ? $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/ticket_verification_event`, {
              method: 'GET',
              query: {
                select: '*,iot_device(*)',
                ticket_id: buildInFilter(ticketIds),
                order: 'created_at.desc',
                limit: 300
              },
              headers
            })
          : Promise.resolve([])
      ])

      const tenantWatchmanIds = Array.from(
        new Set(
          (ticketRows || [])
            .map((row) => asString((row.tenant as Record<string, unknown> | undefined)?.watchman_id))
            .filter(Boolean)
        )
      ) as string[]

      const watchmanRows = tenantWatchmanIds.length
        ? await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/watchman`, {
            method: 'GET',
            query: {
              select: 'id,watchman_name',
              id: buildInFilter(tenantWatchmanIds),
              limit: 100
            },
            headers
          })
        : []

      const watchmanMap = (watchmanRows || []).reduce<Record<string, string>>((acc, row) => {
        const id = String(row.id || '')
        if (id) {
          acc[id] = String(row.watchman_name || 'Unassigned')
        }
        return acc
      }, {})

      const incidentMap = incidents.reduce<Record<string, IotIncident>>((acc, incident) => {
        if (incident.id) {
          acc[incident.id] = incident
        }
        return acc
      }, {})

      const tickets: BuildingOperationsTicket[] = (ticketRows || []).map((row) => {
        const linkedIncidentId = asString(row.linked_iot_incident_id)
        const linkedIncident = linkedIncidentId ? incidentMap[linkedIncidentId] : null
        const tenantRow = row.tenant as Record<string, unknown> | undefined
        const watchmanId = asString(tenantRow?.watchman_id)

        return {
          id: String(row.id || ''),
          title: String(row.title || 'Untitled ticket'),
          description: asString(row.description),
          status: asString(row.status),
          createdAt: asString(row.created_at),
          updatedAt: asString(row.updated_at),
          source: asString(row.source),
          linkedIotIncidentId: linkedIncidentId,
          verificationStatus: asString(row.verification_status),
          tenantName: asString(tenantRow?.full_name),
          unitNumber: asString(tenantRow?.unit_number),
          assignedWatchman: watchmanId ? watchmanMap[watchmanId] || 'Unassigned' : 'Unassigned',
          linkedSensorName: linkedIncident?.iot_device?.device_name || linkedIncident?.iot_device?.sensor_code || null,
          sensorLocation: linkedIncident?.iot_device?.location_label || null,
          severity: linkedIncident?.severity || null
        }
      })

      const verificationEvents = (verificationRows || []).map(normalizeVerificationEvent)

      const summary: BuildingOperationsSummary = {
        buildingId,
        buildingName: buildingAccess.buildingName,
        isOnline: gateways.some((gateway) => (gateway.status || '').toUpperCase() !== 'OFFLINE') || sensors.some((sensor) => (sensor.status || '').toUpperCase() !== 'OFFLINE'),
        openTicketsCount: tickets.filter((ticket) => !['COMPLETED', 'FIXED', 'CLOSED', 'RESOLVED', 'VERIFIED'].includes((ticket.status || '').toUpperCase())).length,
        activeIncidentsCount: incidents.filter((incident) => ['OPEN', 'LINKED_TO_TICKET'].includes((incident.status || '').toUpperCase())).length,
        activeSensorCount: sensors.filter((sensor) => (sensor.status || '').toUpperCase() !== 'OFFLINE').length,
        offlineDeviceCount: sensors.filter((sensor) => (sensor.status || '').toUpperCase() === 'OFFLINE').length,
        lastActivityAt: [
          ...tickets.map((ticket) => ticket.updatedAt || ticket.createdAt),
          ...incidents.map((incident) => incident.started_at),
          ...sensors.map((sensor) => sensor.last_seen_at),
          ...gateways.map((gateway) => gateway.last_seen_at)
        ]
          .filter(Boolean)
          .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0] as string | null
      }

      const activityFeed = buildActivityFeed(incidents, tickets, sensors, gateways, verificationEvents)
      const healthPanel = buildHealthPanel(sensors, gateways, incidents, tickets)

      return {
        data: {
          buildingId,
          buildingName: buildingAccess.buildingName,
          summary,
          gateways,
          sensors,
          incidents,
          tickets,
          activityFeed,
          healthPanel,
          verificationEvents
        },
        error: null
      }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: null,
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load building operations hub.'
      }
    }
  }

  const fetchTicketDetail = async (
    accessToken: string,
    role: string,
    userId: string,
    buildingId: string,
    ticketId: string
  ): Promise<{ data: BuildingOperationsTicketDetail | null; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: null, error: configError }
    }

    if (!ticketId) {
      return { data: null, error: 'Ticket id is required.' }
    }

    const accessResult = await fetchAccessibleBuildings(accessToken, role, userId)
    if (accessResult.error) {
      return { data: null, error: accessResult.error }
    }

    const buildingAccess = accessResult.data.find((item) => item.buildingId === buildingId)
    if (!buildingAccess) {
      return { data: null, error: 'You do not have access to this building.' }
    }

    try {
      const headers = buildHeaders(supabaseAnonKey, accessToken)

      const [ticketRows, verificationRows, timelineRows] = await Promise.all([
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/support_ticket`, {
          method: 'GET',
          query: {
            select: 'id,title,description,status,photo_url,created_at,updated_at,source,linked_iot_incident_id,verification_status,tenant:tenant_id(id,full_name,unit_number,floor,phone,watchman_id)',
            id: `eq.${ticketId}`,
            limit: 1
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/ticket_verification_event`, {
          method: 'GET',
          query: {
            select: '*,iot_device(*)',
            ticket_id: `eq.${ticketId}`,
            order: 'created_at.desc',
            limit: 30
          },
          headers
        }),
        $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/support_ticket_events`, {
          method: 'GET',
          query: {
            select: 'id,event_type,created_at,metadata',
            ticket_id: `eq.${ticketId}`,
            order: 'created_at.asc',
            limit: 50
          },
          headers
        })
      ])

      const ticketRow = ticketRows?.[0]
      if (!ticketRow) {
        return { data: null, error: 'Ticket not found.' }
      }

      const ticketBuildingRows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/v_support_ticket_building`, {
        method: 'GET',
        query: {
          select: 'ticket_id,building_id',
          ticket_id: `eq.${ticketId}`,
          limit: 1
        },
        headers
      })

      const resolvedBuildingId = String(ticketBuildingRows?.[0]?.building_id || '')
      if (resolvedBuildingId !== buildingId) {
        return { data: null, error: 'This ticket does not belong to the selected building.' }
      }

      const tenantRow = ticketRow.tenant as Record<string, unknown> | undefined
      const watchmanId = asString(tenantRow?.watchman_id)

      const watchmanRows = watchmanId
        ? await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/watchman`, {
            method: 'GET',
            query: {
              select: 'id,watchman_name',
              id: `eq.${watchmanId}`,
              limit: 1
            },
            headers
          })
        : []

      const watchmanName = watchmanRows?.[0] ? String(watchmanRows[0].watchman_name || 'Unassigned') : 'Unassigned'
      const linkedIncidentId = asString(ticketRow.linked_iot_incident_id)

      const incidentRows = linkedIncidentId
        ? await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/iot_incident`, {
            method: 'GET',
            query: {
              select: '*,iot_device(*,iot_gateway(*))',
              id: `eq.${linkedIncidentId}`,
              limit: 1
            },
            headers
          })
        : []

      const linkedIncident = incidentRows?.[0] ? normalizeIncident(incidentRows[0]) : null

      const detail: BuildingOperationsTicketDetail = {
        id: String(ticketRow.id || ''),
        title: String(ticketRow.title || 'Untitled ticket'),
        description: asString(ticketRow.description),
        status: asString(ticketRow.status),
        createdAt: asString(ticketRow.created_at),
        updatedAt: asString(ticketRow.updated_at),
        source: asString(ticketRow.source),
        linkedIotIncidentId: linkedIncidentId,
        verificationStatus: asString(ticketRow.verification_status),
        tenantName: asString(tenantRow?.full_name),
        unitNumber: asString(tenantRow?.unit_number),
        assignedWatchman: watchmanName,
        linkedSensorName: linkedIncident?.iot_device?.device_name || linkedIncident?.iot_device?.sensor_code || null,
        sensorLocation: linkedIncident?.iot_device?.location_label || null,
        severity: linkedIncident?.severity || null,
        buildingId,
        buildingName: buildingAccess.buildingName,
        photoUrl: asString(ticketRow.photo_url),
        tenantPhone: asString(tenantRow?.phone),
        tenantFloor: tenantRow?.floor == null ? null : toNumber(tenantRow.floor),
        linkedIncident,
        verificationEvents: (verificationRows || []).map(normalizeVerificationEvent),
        timelineEvents: (timelineRows || []).map(normalizeTimelineEvent)
      }

      return { data: detail, error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: null,
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load ticket details.'
      }
    }
  }

  return {
    fetchAccessibleBuildings,
    fetchBuildingSummaries,
    fetchBuildingOperationsHub,
    fetchTicketDetail
  }
}

const buildActivityFeed = (
  incidents: IotIncident[],
  tickets: BuildingOperationsTicket[],
  sensors: BuildingOperationsSensor[],
  gateways: BuildingOperationsGateway[],
  verificationEvents: TicketVerificationEvent[]
): BuildingActivityItem[] => {
  const incidentItems: BuildingActivityItem[] = incidents.map((incident) => ({
    id: `incident-${incident.id}`,
    type: 'incident',
    title: incident.incident_type?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase()) || 'Incident detected',
    detail: `${incident.iot_device?.device_name || incident.iot_device?.sensor_code || 'Sensor'} at ${incident.iot_device?.location_label || 'unknown location'}`,
    timestamp: incident.started_at,
    severity: (incident.severity || '').toUpperCase() === 'HIGH' ? 'critical' : 'warning'
  }))

  const ticketItems: BuildingActivityItem[] = tickets.map((ticket) => ({
    id: `ticket-${ticket.id}`,
    type: 'ticket',
    title: ticket.source === 'IOT_AUTO' ? 'Ticket auto-created' : 'Maintenance ticket updated',
    detail: `${ticket.title} - ${ticket.status || 'Unknown status'}`,
    timestamp: ticket.updatedAt || ticket.createdAt,
    severity: ticket.source === 'IOT_AUTO' ? 'warning' : 'normal'
  }))

  const sensorItems: BuildingActivityItem[] = sensors
    .filter((sensor) => (sensor.status || '').toUpperCase() === 'OFFLINE')
    .map((sensor) => ({
      id: `sensor-${sensor.id}`,
      type: 'sensor',
      title: 'Sensor disconnected',
      detail: `${sensor.device_name || sensor.sensor_code || 'Sensor'} went offline`,
      timestamp: sensor.last_seen_at,
      severity: 'warning'
    }))

  const gatewayItems: BuildingActivityItem[] = gateways
    .filter((gateway) => (gateway.status || '').toUpperCase() !== 'ACTIVE')
    .map((gateway) => ({
      id: `gateway-${gateway.id}`,
      type: 'gateway',
      title: 'Gateway attention needed',
      detail: `${gateway.gateway_code || gateway.location_label || 'Gateway'} status is ${gateway.status || 'unknown'}`,
      timestamp: gateway.last_seen_at,
      severity: 'warning'
    }))

  const verificationItems: BuildingActivityItem[] = verificationEvents.map((event) => ({
    id: `verification-${event.id}`,
    type: 'verification',
    title: event.verification_status === 'SUPPORTED' ? 'Repair verified by sensor' : 'Verification event recorded',
    detail: event.evidence_summary || event.verification_type || 'Sensor evidence updated',
    timestamp: event.verified_at || event.created_at,
    severity: event.verification_status === 'SUPPORTED' ? 'success' : 'normal'
  }))

  return [...incidentItems, ...ticketItems, ...sensorItems, ...gatewayItems, ...verificationItems]
    .sort((a, b) => new Date(String(b.timestamp || 0)).getTime() - new Date(String(a.timestamp || 0)).getTime())
    .slice(0, 30)
}

const buildHealthPanel = (
  sensors: BuildingOperationsSensor[],
  gateways: BuildingOperationsGateway[],
  incidents: IotIncident[],
  tickets: BuildingOperationsTicket[]
): DeviceHealthPanel => {
  const offlineSensors = sensors.filter((sensor) => (sensor.status || '').toUpperCase() === 'OFFLINE')
  const offlineGateways = gateways.filter((gateway) => (gateway.status || '').toUpperCase() === 'OFFLINE')
  const unlinkedIncidentsCount = incidents.filter(
    (incident) =>
      ['OPEN', 'LINKED_TO_TICKET'].includes((incident.status || '').toUpperCase()) &&
      !incident.linked_ticket_id
  ).length
  const pendingVerificationCount = tickets.filter(
    (ticket) => (ticket.verificationStatus || '').toUpperCase() === 'PENDING'
  ).length

  return {
    offlineSensors,
    offlineGateways,
    unlinkedIncidentsCount,
    pendingVerificationCount
  }
}

