import { ref } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'

interface SupabaseApiError {
  message?: string
  error_description?: string
}

export interface BuildingTrustPermissions {
  isAuthenticated: boolean
  isLandlord: boolean
  isBuildingOwner: boolean
  canRefreshScore: boolean
  canRefreshBadges: boolean
  canViewHistory: boolean
  canCopyBuildingId: boolean
}

const defaultPermissions = (): BuildingTrustPermissions => ({
  isAuthenticated: false,
  isLandlord: false,
  isBuildingOwner: false,
  canRefreshScore: false,
  canRefreshBadges: false,
  canViewHistory: true,
  canCopyBuildingId: true
})

const buildHeaders = (anonKey: string, accessToken?: string) => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken || anonKey}`
})

export const useBuildingTrustPermissions = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  const loading = ref(false)
  const errorMessage = ref('')
  const permissions = ref<BuildingTrustPermissions>(defaultPermissions())

  const resolvePermissions = async (buildingId: string) => {
    permissions.value = defaultPermissions()
    errorMessage.value = ''

    if (!process.client) {
      return permissions.value
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      errorMessage.value = 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
      return permissions.value
    }

    const accessToken = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
    const userId = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''
    const role = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''

    const isAuthenticated = Boolean(accessToken && userId)
    const isLandlord = role === 'LANDLORD'

    permissions.value = {
      ...permissions.value,
      isAuthenticated,
      isLandlord
    }

    if (!isAuthenticated || !isLandlord || !buildingId) {
      return permissions.value
    }

    loading.value = true
    try {
      const landlordRows = await $fetch<{ id: string }[]>(`${supabaseUrl}/rest/v1/landlord`, {
        method: 'GET',
        query: {
          select: 'id',
          user_id: `eq.${userId}`,
          limit: 1
        },
        headers: {
          ...buildHeaders(supabaseAnonKey, accessToken),
          Range: '0-0'
        }
      })

      const landlordId = landlordRows?.[0]?.id

      if (!landlordId) {
        permissions.value = {
          ...permissions.value,
          isBuildingOwner: false,
          canRefreshScore: false,
          canRefreshBadges: false
        }
        return permissions.value
      }

      const ownerRows = await $fetch<{ id: string }[]>(`${supabaseUrl}/rest/v1/watchman`, {
        method: 'GET',
        query: {
          select: 'id',
          building_id: `eq.${buildingId}`,
          landlord_id: `eq.${landlordId}`,
          limit: 1
        },
        headers: {
          ...buildHeaders(supabaseAnonKey, accessToken),
          Range: '0-0'
        }
      })

      const isBuildingOwner = Boolean(ownerRows?.[0]?.id)
      permissions.value = {
        ...permissions.value,
        isBuildingOwner,
        canRefreshScore: isAuthenticated && isBuildingOwner,
        canRefreshBadges: isAuthenticated && isBuildingOwner
      }
    } catch (error) {
      const err = error as { data?: SupabaseApiError; message?: string }
      errorMessage.value =
        err?.data?.message ??
        err?.data?.error_description ??
        err?.message ??
        'Unable to verify building permissions.'
    } finally {
      loading.value = false
    }

    return permissions.value
  }

  return {
    permissions,
    loading,
    errorMessage,
    resolvePermissions
  }
}
