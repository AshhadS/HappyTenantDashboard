<template>
  <main class="dashboard-page">
    <Card class="dashboard-card">
      <template #title>Dashboard</template>
      <template #content>
        <p>You are signed in successfully.</p>
      </template>
    </Card>
  </main>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: #f6f8fb;
}

.dashboard-card {
  width: min(100%, 560px);
}
</style>
