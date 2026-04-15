<template>
  <Tag :value="text" :severity="severity" rounded />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  trend: number
}>()

const text = computed(() => {
  if (props.trend > 0) {
    return `Improving +${props.trend.toFixed(1)}`
  }

  if (props.trend < 0) {
    return `Declining ${props.trend.toFixed(1)}`
  }

  return 'Stable 0.0'
})

const severity = computed(() => {
  if (props.trend > 0) {
    return 'success'
  }

  if (props.trend < 0) {
    return 'danger'
  }

  return 'info'
})
</script>
