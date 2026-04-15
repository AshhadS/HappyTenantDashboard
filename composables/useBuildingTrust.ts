import type {
  BuildingListingItem,
  BuildingScoreBand,
  BuildingScoreHistoryPoint,
  BuildingSortKey,
  BuildingTransparencyMetrics,
  BuildingTrustBadge,
  BuildingTrustProfile
} from '~/types/buildingTrust'

interface SupabaseApiError {
  message?: string
  error_description?: string
}

interface ListOptions {
  landlordUserId?: string
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeMetrics = (row: Record<string, unknown>): BuildingTransparencyMetrics => ({
  building_id: String(row.building_id || ''),
  building_name: row.building_name ? String(row.building_name) : null,
  window_days: toNumber(row.window_days, 30),
  ticket_count: toNumber(row.ticket_count),
  completed_count: toNumber(row.completed_count),
  verified_count: toNumber(row.verified_count),
  reopened_count: toNumber(row.reopened_count),
  overdue_count: toNumber(row.overdue_count),
  avg_first_view_minutes: toNumber(row.avg_first_view_minutes),
  avg_first_response_minutes: toNumber(row.avg_first_response_minutes),
  avg_resolution_minutes: toNumber(row.avg_resolution_minutes),
  completion_rate: toNumber(row.completion_rate),
  verification_rate: toNumber(row.verification_rate),
  reopened_rate: toNumber(row.reopened_rate),
  overdue_rate: toNumber(row.overdue_rate),
  transparency_score: toNumber(row.transparency_score),
  confidence_score: toNumber(row.confidence_score),
  trend_vs_previous: toNumber(row.trend_vs_previous),
  calculated_at: row.calculated_at ? String(row.calculated_at) : '',
  view_score: row.view_score == null ? undefined : toNumber(row.view_score),
  response_score: row.response_score == null ? undefined : toNumber(row.response_score),
  resolution_score: row.resolution_score == null ? undefined : toNumber(row.resolution_score),
  completion_score: row.completion_score == null ? undefined : toNumber(row.completion_score),
  verification_score: row.verification_score == null ? undefined : toNumber(row.verification_score),
  reopened_penalty: row.reopened_penalty == null ? undefined : toNumber(row.reopened_penalty),
  overdue_penalty: row.overdue_penalty == null ? undefined : toNumber(row.overdue_penalty)
})

const normalizeBadge = (row: Record<string, unknown>): BuildingTrustBadge => ({
  badge_code: String(row.badge_code || ''),
  badge_label: String(row.badge_label || 'Badge'),
  badge_reason: row.badge_reason ? String(row.badge_reason) : null,
  earned_at: row.earned_at ? String(row.earned_at) : '',
  expires_at: row.expires_at ? String(row.expires_at) : null,
  is_active: Boolean(row.is_active)
})

const buildHeaders = (anonKey: string, accessToken?: string) => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken || anonKey}`
})

const buildInFilter = (values: string[]) => {
  if (!values.length) {
    return ''
  }

  const safeValues = values.map((value) => `"${value}"`)
  return `in.(${safeValues.join(',')})`
}

export const scoreLabel = (score: number) => {
  if (score >= 85) {
    return 'Excellent'
  }

  if (score >= 70) {
    return 'Strong'
  }

  if (score >= 50) {
    return 'Fair'
  }

  return 'Needs Attention'
}

export const confidenceLabel = (score: number) => {
  if (score >= 80) {
    return 'High Confidence'
  }

  if (score >= 50) {
    return 'Moderate Confidence'
  }

  return 'Limited Data'
}

export const trendLabel = (trend: number) => {
  if (trend > 0) {
    return 'Improving'
  }

  if (trend < 0) {
    return 'Declining'
  }

  return 'Stable'
}

export const reliabilityLabel = (score: number, confidence: number, overdueRate: number) => {
  if (score >= 80 && confidence >= 80) {
    return 'Trusted'
  }

  if (score >= 75 && confidence < 50) {
    return 'Promising'
  }

  if (overdueRate >= 20 || score < 50) {
    return 'Needs Attention'
  }

  return 'Improving'
}

export const formatPercent = (value: number) => `${value.toFixed(1)}%`

export const formatDateTime = (value?: string) => {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

export const formatMinutes = (totalMinutes?: number) => {
  const minutes = Number(totalMinutes)
  if (!Number.isFinite(minutes) || minutes < 0) {
    return '--'
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days} day ${remainingHours} hr` : `${days} day`
}

const matchesScoreBand = (score: number, band: BuildingScoreBand) => {
  if (band === 'all') {
    return true
  }

  if (band === 'excellent') {
    return score >= 80
  }

  if (band === 'strong') {
    return score >= 60 && score < 80
  }

  return score < 60
}

export const filterAndSortBuildings = (
  source: BuildingListingItem[],
  options: {
    searchTerm: string
    sortKey: BuildingSortKey
    scoreBand: BuildingScoreBand
    hasBadgesOnly: boolean
    lowConfidenceOnly: boolean
  }
) => {
  const search = options.searchTerm.trim().toLowerCase()

  const filtered = source.filter((item) => {
    const searchable = `${item.building_name || ''} ${item.building_id}`.toLowerCase()
    const searchMatch = !search || searchable.includes(search)
    const bandMatch = matchesScoreBand(item.transparency_score, options.scoreBand)
    const badgesMatch = !options.hasBadgesOnly || item.active_badges.length > 0
    const confidenceMatch = !options.lowConfidenceOnly || item.confidence_score < 50

    return searchMatch && bandMatch && badgesMatch && confidenceMatch
  })

  const sorted = [...filtered]
  sorted.sort((a, b) => {
    switch (options.sortKey) {
      case 'lowest_score':
        return a.transparency_score - b.transparency_score
      case 'most_improved':
        return b.trend_vs_previous - a.trend_vs_previous
      case 'highest_ticket_count':
        return b.ticket_count - a.ticket_count
      case 'lowest_overdue_rate':
        return a.overdue_rate - b.overdue_rate
      case 'highest_score':
      default:
        return b.transparency_score - a.transparency_score
    }
  })

  return sorted
}

export const useBuildingTrust = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  const getConfigError = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
    }
    return null
  }

  const fetchLandlordBuildingIds = async (accessToken: string, landlordUserId: string) => {
    if (!landlordUserId) {
      return []
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

  const fetchBuildingListing = async (
    accessToken: string,
    options: ListOptions = {}
  ): Promise<{ data: BuildingListingItem[]; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: [], error: configError }
    }

    try {
      let buildingIds: string[] = []
      if (options.landlordUserId) {
        buildingIds = await fetchLandlordBuildingIds(accessToken, options.landlordUserId)
        if (!buildingIds.length) {
          return { data: [], error: null }
        }
      }

      const metrics = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/building_transparency_metrics`, {
        method: 'GET',
        query: {
          select:
            'building_id,building_name,window_days,ticket_count,completed_count,verified_count,reopened_count,overdue_count,avg_first_view_minutes,avg_first_response_minutes,avg_resolution_minutes,completion_rate,verification_rate,reopened_rate,overdue_rate,view_score,response_score,resolution_score,completion_score,verification_score,reopened_penalty,overdue_penalty,transparency_score,confidence_score,trend_vs_previous,calculated_at',
          ...(buildingIds.length ? { building_id: buildInFilter(buildingIds) } : {}),
          order: 'transparency_score.desc',
          limit: 1000
        },
        headers: buildHeaders(supabaseAnonKey, accessToken)
      })

      const metricRows = (metrics || []).map(normalizeMetrics)
      const badgeQuery: Record<string, string | number> = {
        select: 'building_id,badge_code,badge_label,badge_reason,earned_at,expires_at,is_active',
        is_active: 'eq.true',
        limit: 1000
      }
      if (buildingIds.length) {
        badgeQuery.building_id = buildInFilter(buildingIds)
      }

      const badges = await $fetch<(Record<string, unknown> & { building_id?: string })[]>(
        `${supabaseUrl}/rest/v1/building_trust_badges`,
        {
          method: 'GET',
          query: badgeQuery,
          headers: buildHeaders(supabaseAnonKey, accessToken)
        }
      )

      const badgeMap = (badges || []).reduce<Record<string, BuildingTrustBadge[]>>((acc, row) => {
        const key = String(row.building_id || '')
        if (!key) {
          return acc
        }
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(normalizeBadge(row))
        return acc
      }, {})

      const data = metricRows.map((item) => ({
        ...item,
        active_badges: badgeMap[item.building_id] || []
      }))

      return {
        data,
        error: null
      }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: [],
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load building listing.'
      }
    }
  }

  const fetchBuildingTrustProfile = async (
    accessToken: string,
    buildingId: string
  ): Promise<{ data: BuildingTrustProfile | null; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: null, error: configError }
    }

    if (!buildingId) {
      return { data: null, error: 'Building id is required.' }
    }

    try {
      const profile = await $fetch<{ metrics?: Record<string, unknown> | null; badges?: Record<string, unknown>[] }>(
        `${supabaseUrl}/rest/v1/rpc/get_building_trust_profile`,
        {
          method: 'POST',
          body: { p_building_id: buildingId },
          headers: buildHeaders(supabaseAnonKey, accessToken)
        }
      )

      const data: BuildingTrustProfile = {
        metrics: profile?.metrics ? normalizeMetrics(profile.metrics) : null,
        badges: (profile?.badges || []).map((badge) => normalizeBadge(badge))
      }

      return { data, error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: null,
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load building profile.'
      }
    }
  }

  const fetchBuildingScoreHistory = async (
    accessToken: string,
    buildingId: string
  ): Promise<{ data: BuildingScoreHistoryPoint[]; error: string | null }> => {
    const configError = getConfigError()
    if (configError) {
      return { data: [], error: configError }
    }

    if (!buildingId) {
      return { data: [], error: 'Building id is required.' }
    }

    try {
      const rows = await $fetch<Record<string, unknown>[]>(`${supabaseUrl}/rest/v1/building_transparency_score_history`, {
        method: 'GET',
        query: {
          select: 'id,building_id,building_name,window_days,transparency_score,confidence_score,calculated_at',
          building_id: `eq.${buildingId}`,
          order: 'calculated_at.asc',
          limit: 90
        },
        headers: buildHeaders(supabaseAnonKey, accessToken)
      })

      const data = (rows || []).map((row) => ({
        id: String(row.id || ''),
        building_id: String(row.building_id || ''),
        building_name: row.building_name ? String(row.building_name) : null,
        window_days: toNumber(row.window_days, 30),
        transparency_score: toNumber(row.transparency_score),
        confidence_score: toNumber(row.confidence_score),
        calculated_at: row.calculated_at ? String(row.calculated_at) : ''
      }))

      return { data, error: null }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      return {
        data: [],
        error: err?.data?.message ?? err?.data?.error_description ?? err?.message ?? 'Unable to load score history.'
      }
    }
  }

  return {
    fetchBuildingListing,
    fetchBuildingTrustProfile,
    fetchBuildingScoreHistory
  }
}
