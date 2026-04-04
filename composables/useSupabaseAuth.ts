interface SupabaseAuthError {
  message?: string
  error_description?: string
}

interface SupabasePasswordSignInResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: {
    id: string
    email?: string
    role?: string
    app_metadata?: {
      role?: string
    }
    user_metadata?: {
      role?: string
    }
  }
}

interface SupabaseTableCountResult {
  count: number | null
  error: string | null
}

interface SupabaseUserProfileResult {
  profile: {
    id: string
    email?: string
    full_name?: string
    role?: string
  } | null
  error: string | null
}

export const SUPABASE_ACCESS_TOKEN_KEY = 'supabase.access_token'
export const SUPABASE_USER_ROLE_KEY = 'supabase.user.role'
export const SUPABASE_USER_ID_KEY = 'supabase.user.id'

const buildHeaders = (anonKey: string, accessToken?: string) => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken || anonKey}`
})

export const useSupabaseAuth = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  const getConfigError = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
    }

    return null
  }

  const signInWithPassword = async (email: string, password: string) => {
    const configError = getConfigError()

    if (configError) {
      return {
        data: null,
        error: configError
      }
    }

    try {
      const response = await $fetch<SupabasePasswordSignInResponse>(`${supabaseUrl}/auth/v1/token`, {
        method: 'POST',
        query: {
          grant_type: 'password'
        },
        headers: buildHeaders(supabaseAnonKey),
        body: {
          email,
          password
        }
      })

      return {
        data: response,
        error: null
      }
    } catch (error) {
      const authError = error as { data?: SupabaseAuthError }

      return {
        data: null,
        error: authError?.data?.message ?? authError?.data?.error_description ?? 'Unable to sign in.'
      }
    }
  }

  const resetPasswordForEmail = async (email: string) => {
    const configError = getConfigError()

    if (configError) {
      return {
        error: configError
      }
    }

    try {
      await $fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: buildHeaders(supabaseAnonKey),
        body: {
          email
        }
      })

      return {
        error: null
      }
    } catch (error) {
      const authError = error as { data?: SupabaseAuthError }

      return {
        error: authError?.data?.message ?? authError?.data?.error_description ?? 'Unable to send reset email.'
      }
    }
  }

  const getTableCount = async (tableName: string, accessToken: string): Promise<SupabaseTableCountResult> => {
    const configError = getConfigError()

    if (configError) {
      return {
        count: null,
        error: configError
      }
    }

    try {
      const response = await $fetch.raw(`${supabaseUrl}/rest/v1/${tableName}`, {
        method: 'GET',
        query: {
          select: 'id'
        },
        headers: {
          ...buildHeaders(supabaseAnonKey, accessToken),
          Prefer: 'count=exact',
          Range: '0-0'
        }
      })

      const contentRange = response.headers.get('content-range') || ''
      const total = Number(contentRange.split('/')[1])

      return {
        count: Number.isFinite(total) ? total : 0,
        error: null
      }
    } catch (error) {
      const authError = error as { data?: SupabaseAuthError }

      return {
        count: null,
        error: authError?.data?.message ?? authError?.data?.error_description ?? `Unable to load ${tableName} count.`
      }
    }
  }

  const fetchUserProfile = async (userId: string, accessToken: string): Promise<SupabaseUserProfileResult> => {
    const configError = getConfigError()

    if (configError) {
      return {
        profile: null,
        error: configError
      }
    }

    if (!userId) {
      return {
        profile: null,
        error: 'Missing authenticated user id.'
      }
    }

    if (!accessToken) {
      return {
        profile: null,
        error: 'Missing Supabase access token.'
      }
    }

    try {
      const data = await $fetch<{ id: string; email?: string; full_name?: string; role?: string }[]>(
        `${supabaseUrl}/rest/v1/users`,
        {
          method: 'GET',
          query: {
            select: 'id,email,full_name,role',
            id: `eq.${userId}`,
            limit: 1
          },
          headers: {
            ...buildHeaders(supabaseAnonKey, accessToken),
            Range: '0-0'
          }
        }
      )

      return {
        profile: data?.[0] ?? null,
        error: null
      }
    } catch (error) {
      const authError = error as { data?: SupabaseAuthError }

      return {
        profile: null,
        error: authError?.data?.message ?? authError?.data?.error_description ?? 'Unable to load user profile.'
      }
    }
  }

  return {
    signInWithPassword,
    resetPasswordForEmail,
    getTableCount,
    fetchUserProfile
  }
}
