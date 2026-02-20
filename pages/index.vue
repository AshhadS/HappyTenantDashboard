<template>
  <main class="wrapper">
    <Card>
      <template #title>Happy Tenant Dashboard</template>
      <template #content>
        <p class="subtitle">
          Nuxt + PrimeVue project is ready.
        </p>
        <Button label="Get Started" icon="pi pi-arrow-right" />
      </template>
    </Card>
  </main>
</template>

<style scoped>
.wrapper {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}

.subtitle {
  margin-bottom: 1rem;
}
</style>
