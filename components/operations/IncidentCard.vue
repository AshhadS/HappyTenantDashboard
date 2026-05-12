<template>
  <article class="incident-card">
    <div class="incident-card__header">
      <div>
        <small>{{ startedLabel }}</small>
        <h4>{{ title }}</h4>
      </div>
      <Tag :value="severityLabel" :severity="severityTone" rounded />
    </div>

    <div class="incident-card__meta">
      <span>Source: {{ incident.iot_device?.device_name || incident.iot_device?.sensor_code || 'Unknown sensor' }}</span>
      <span>Location: {{ incident.iot_device?.location_label || 'Unknown location' }}</span>
      <span>Status: {{ incident.status || '--' }}</span>
      <span>Linked Ticket: {{ incident.linked_ticket_id || 'Not created' }}</span>
      <span v-if="incident.confidence_score != null">Confidence: {{ Math.round(incident.confidence_score) }}%</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IotIncident } from '~/types/iotMaintenance'

const props = defineProps<{
  incident: IotIncident
}>()

const title = computed(() => {
  const base = props.incident.incident_type || 'Incident'
  return base.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
})

const severityLabel = computed(() => props.incident.severity || 'NORMAL')
const severityTone = computed(() => {
  const severity = (props.incident.severity || '').toUpperCase()
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    return 'danger'
  }
  if (severity === 'MEDIUM') {
    return 'warning'
  }
  return 'success'
})

const startedLabel = computed(() => {
  if (!props.incident.started_at) {
    return 'Started recently'
  }

  return new Date(props.incident.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
})
</script>

<style scoped>
.incident-card {
  border: 1px solid rgba(180, 83, 9, 0.14);
  border-radius: 1rem;
  background: #fff;
  padding: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.incident-card__header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}

.incident-card__header small {
  color: var(--color-carbon-black-500);
}

.incident-card__header h4 {
  margin: 0.2rem 0 0;
  color: var(--color-carbon-black-900);
}

.incident-card__meta {
  display: grid;
  gap: 0.35rem;
  color: var(--color-carbon-black-700);
  font-size: 0.9rem;
}

</style>
