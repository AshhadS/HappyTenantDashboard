<template>
  <main class="forgot-page">
    <Card class="forgot-card">
      <template #title>Reset password</template>
      <template #subtitle>Enter your account email to receive a reset link.</template>
      <template #content>
        <form class="forgot-form" @submit.prevent="onSubmit">
          <InputText
            id="reset-email"
            v-model="email"
            type="email"
            placeholder="Email address"
            autocomplete="email"
          />

          <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
          <Message v-if="successMessage" severity="success" :closable="false">{{ successMessage }}</Message>

          <div class="actions">
            <Button type="button" label="Back to login" variant="text" @click="navigateTo('/')" />
            <Button type="submit" label="Send reset email" :loading="isSubmitting" :disabled="isSubmitting" />
          </div>
        </form>
      </template>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

const { resetPasswordForEmail } = useSupabaseAuth()

const onSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!email.value) {
    errorMessage.value = 'Please enter your email address.'

    return
  }

  isSubmitting.value = true

  const { error } = await resetPasswordForEmail(email.value)

  isSubmitting.value = false

  if (error) {
    errorMessage.value = error

    return
  }

  successMessage.value = 'Reset link sent. Please check your inbox.'
}
</script>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: #f6f8fb;
}

.forgot-card {
  width: min(100%, 560px);
}

.forgot-form {
  display: grid;
  gap: 1rem;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
