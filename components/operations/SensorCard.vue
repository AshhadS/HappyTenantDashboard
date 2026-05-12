<template>
  <article class="sensor-card">
    <div class="sensor-card__header">
      <div class="sensor-card__title">
        <div class="sensor-card__icon">
          <span>{{ sensorSymbol }}</span>
        </div>
        <small>{{ sensor.device_type?.replace(/_/g, ' ') || 'Sensor' }}</small>
        <h4>{{ sensor.device_name || sensor.sensor_code || 'Sensor' }}</h4>
      </div>
      <Tag :value="isOffline ? 'OFFLINE' : 'ONLINE'" :severity="isOffline ? 'danger' : 'success'" rounded />
    </div>

    <div class="sensor-card__meta">
      <span>{{ sensor.location_label || 'Location pending' }}</span>
    </div>

    <small class="sensor-card__created">Registered {{ createdLabel }}</small>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BuildingOperationsSensor } from '~/types/buildingOperations'

const props = defineProps<{
  sensor: BuildingOperationsSensor
}>()

const isOffline = computed(() => (props.sensor.status || '').toUpperCase() === 'OFFLINE')

const sensorSymbol = computed(() => {
  switch ((props.sensor.device_type || '').toUpperCase()) {
    case 'WATER_LEAK':
      return '💧'
    case 'TEMPERATURE':
      return '🌡'
    case 'POWER':
      return '⚡'
    default:
      return '📡'
  }
})

const lastSeenLabel = computed(() => {
  if (!props.sensor.last_seen_at) {
    return 'No activity yet'
  }

  return new Date(props.sensor.last_seen_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
})

const createdLabel = computed(() => {
  if (!props.sensor.created_at) {
    return 'recently'
  }

  return new Date(props.sensor.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
})
</script>

<style scoped>
.sensor-card {
  border: 1px solid var(--color-soft-linen-200);
  border-radius: 1rem;
  background: #fff;
  padding: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.sensor-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.65rem;
}

.sensor-card__title {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.sensor-card__icon {
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-soft-linen-50);
  color: var(--color-indigo-velvet-500);
  border: 1px solid var(--color-soft-linen-200);
}

.sensor-card__icon span {
  font-size: 1.12rem;
  line-height: 1;
}

.sensor-card__header small {
  color: var(--color-carbon-black-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.72rem;
}

.sensor-card__header h4 {
  margin: 0.12rem 0 0;
  color: var(--color-carbon-black-900);
  font-size: 0.98rem;
  line-height: 1.25;
}

.sensor-card__meta {
  display: grid;
  gap: 0.15rem;
  color: var(--color-carbon-black-700);
  font-size: 0.82rem;
  line-height: 1.35;
}

.sensor-card__created {
  color: var(--color-carbon-black-500);
  font-size: 0.76rem;
}
</style>
