<template>
  <main class="login-page">
    <div class="background-overlay" />

    <Card class="login-card">
      <template #title>
        <div class="card-title">Happy Tenant Dashboard</div>
      </template>
      <template #subtitle>
        <p class="card-subtitle">Sign in to manage your properties, tenants, and leases.</p>
      </template>
      <template #content>
        <form class="login-form" @submit.prevent="onSubmit">
          <IconField>
            <InputIcon class="pi pi-envelope" />
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="Email address"
              class="w-full"
              autocomplete="email"
            />
          </IconField>

          <IconField>
            <InputIcon class="pi pi-lock" />
            <Password
              id="password"
              v-model="password"
              placeholder="Password"
              :feedback="false"
              toggle-mask
              fluid
              :input-props="{ autocomplete: 'current-password' }"
            />
          </IconField>

          <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

          <div class="login-actions">
            <div class="remember-me">
              <Checkbox input-id="remember" v-model="rememberMe" binary />
              <label for="remember">Remember me</label>
            </div>
            <Button
              type="button"
              variant="text"
              label="Forgot password?"
              class="forgot-btn"
              @click="navigateTo(forgotPasswordRoute)"
            />
          </div>

          <Button
            type="submit"
            label="Log In"
            icon="pi pi-sign-in"
            class="w-full"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          />
        </form>
      </template>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ROLE_KEY, SUPABASE_USER_ID_KEY } from '~/composables/useSupabaseAuth'

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const errorMessage = ref('')
const isSubmitting = ref(false)

const authState = useState<boolean>('auth-state', () => false)
const config = useRuntimeConfig()
const postLoginRoute = config.public.postLoginRoute || '/dashboard'
const forgotPasswordRoute = config.public.forgotPasswordRoute || '/forgot-password'

const { signInWithPassword, fetchUserProfile } = useSupabaseAuth()

const canAccessApp = (role: string) => role === 'authenticated' || role === 'LANDLORD'

const onSubmit = async () => {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter your email and password.'

    return
  }

  isSubmitting.value = true

  const { data, error } = await signInWithPassword(email.value, password.value)

  isSubmitting.value = false

  if (error) {
    errorMessage.value = error

    return
  }

  if (process.client && data?.access_token) {
    const authUserId = data.user?.id || ''
    let resolvedRole = data.user?.app_metadata?.role || data.user?.user_metadata?.role || data.user?.role || 'authenticated'

    if (authUserId) {
      const { profile } = await fetchUserProfile(authUserId, data.access_token)

      if (profile?.role) {
        resolvedRole = profile.role
      }
    }

    localStorage.setItem(SUPABASE_ACCESS_TOKEN_KEY, data.access_token)

    if (authUserId) {
      localStorage.setItem(SUPABASE_USER_ID_KEY, authUserId)
    }

    localStorage.setItem(SUPABASE_USER_ROLE_KEY, resolvedRole)
    authState.value = canAccessApp(resolvedRole)
  }

  await navigateTo(postLoginRoute)
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 2rem;
  background:
    linear-gradient(120deg, rgba(10, 20, 40, 0.75), rgba(34, 74, 112, 0.45)),
    url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80') center / cover no-repeat;
}

.background-overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(1px);
}

.login-card {
  position: relative;
  width: min(100%, 430px);
  z-index: 1;
  padding: 0.5rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.25);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1c2b44;
}

.card-subtitle {
  margin: 0;
  color: #53627a;
}

.login-form {
  display: grid;
  gap: 1rem;
  margin-top: 0.5rem;
}

.login-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #475569;
}

.forgot-btn {
  padding: 0;
}
</style>
