export interface BuildingTransparencyMetrics {
  building_id: string
  building_name: string | null
  window_days: number
  ticket_count: number
  completed_count: number
  verified_count: number
  reopened_count: number
  overdue_count: number
  avg_first_view_minutes: number
  avg_first_response_minutes: number
  avg_resolution_minutes: number
  completion_rate: number
  verification_rate: number
  reopened_rate: number
  overdue_rate: number
  transparency_score: number
  confidence_score: number
  trend_vs_previous: number
  calculated_at: string
  view_score?: number
  response_score?: number
  resolution_score?: number
  completion_score?: number
  verification_score?: number
  reopened_penalty?: number
  overdue_penalty?: number
}

export interface BuildingTrustBadge {
  badge_code: string
  badge_label: string
  badge_reason: string | null
  earned_at: string
  expires_at?: string | null
  is_active?: boolean
}

export interface BuildingTrustProfile {
  metrics: BuildingTransparencyMetrics | null
  badges: BuildingTrustBadge[]
}

export interface BuildingScoreHistoryPoint {
  id: string
  building_id: string
  building_name: string | null
  window_days: number
  transparency_score: number
  confidence_score: number
  calculated_at: string
}

export interface BuildingListingItem extends BuildingTransparencyMetrics {
  active_badges: BuildingTrustBadge[]
}

export type BuildingSortKey =
  | 'highest_score'
  | 'lowest_score'
  | 'most_improved'
  | 'highest_ticket_count'
  | 'lowest_overdue_rate'

export type BuildingScoreBand = 'all' | 'excellent' | 'strong' | 'fair_or_low'
