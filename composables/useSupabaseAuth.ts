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
  }
}

const buildHeaders = (anonKey: string) => ({
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`
})

export const useSupabaseAuth = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  const assertConfig = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
    }
  }

  const signInWithPassword = async (email: string, password: string) => {
    assertConfig()

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
    assertConfig()

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

  return {
    signInWithPassword,
    resetPasswordForEmail
  }
}
