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

export const SUPABASE_ACCESS_TOKEN_KEY = 'supabase.access_token'
export const SUPABASE_USER_ROLE_KEY = 'supabase.user.role'

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

  return {
    signInWithPassword,
    resetPasswordForEmail,
    getTableCount
  }
}
