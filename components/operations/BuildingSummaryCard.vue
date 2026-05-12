<template>
  <article class="building-card" role="button" tabindex="0" @click="$emit('select')" @keyup.enter="$emit('select')">
    <div class="building-card__top">
      <div>
        <small>{{ summary.buildingId }}</small>
        <h3>{{ summary.buildingName }}</h3>
      </div>
      <Tag :value="summary.isOnline ? 'ONLINE' : 'OFFLINE'" :severity="summary.isOnline ? 'success' : 'danger'" rounded />
    </div>

    <div class="building-card__stats">
      <div class="building-stat">
        <span>{{ summary.activeSensorCount }}</span>
        <small>Sensors Active</small>
      </div>
      <div class="building-stat">
        <span>{{ summary.activeIncidentsCount }}</span>
        <small>Active Incidents</small>
      </div>
      <div class="building-stat">
        <span>{{ summary.openTicketsCount }}</span>
        <small>Open Tickets</small>
      </div>
      <div class="building-stat">
        <span>{{ summary.offlineDeviceCount }}</span>
        <small>Offline Devices</small>
      </div>
    </div>

    <div class="building-card__footer">
      <span>{{ summary.lastActivityAt ? `Last activity ${lastActivityLabel}` : 'No recent activity' }}</span>
      <i class="pi pi-arrow-right" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BuildingOperationsSummary } from '~/types/buildingOperations'

const props = defineProps<{
  summary: BuildingOperationsSummary
}>()

defineEmits<{
  select: []
}>()

const lastActivityLabel = computed(() => {
  if (!props.summary.lastActivityAt) {
    return '--'
  }

  const diffMs = Date.now() - new Date(props.summary.lastActivityAt).getTime()
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))
  if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`
  }

  const diffHours = Math.round(diffMinutes / 60)
  return `${diffHours} hrs ago`
})
</script>

<style scoped>
.building-card {
  border: 1px solid var(--color-soft-linen-200);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.96);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.building-card:hover,
.building-card:focus-visible {
  transform: translateY(-2px);
  border-color: var(--color-sunflower-gold-500);
  outline: none;
}

.building-card__top {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}

.building-card__top small {
  color: var(--color-carbon-black-500);
}

.building-card__top h3 {
  margin: 0.15rem 0 0;
  color: var(--color-carbon-black-900);
}

.building-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.building-stat {
  border-radius: 0.8rem;
  background: var(--color-soft-linen-50);
  padding: 0.7rem;
}

.building-stat span {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-carbon-black-900);
}

.building-stat small {
  color: var(--color-carbon-black-600);
}

.building-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-carbon-black-600);
  font-size: 0.88rem;
}
</style>
