<template>
  <Tag :value="label" :severity="severity" rounded />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
}>()

const severity = computed(() => {
  if (props.label === 'Trusted') {
    return 'success'
  }

  if (props.label === 'Improving' || props.label === 'Promising') {
    return 'info'
  }

  return 'warning'
})
</script>
