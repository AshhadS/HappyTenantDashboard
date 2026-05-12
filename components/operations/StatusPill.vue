<template>
  <div :class="['status-pill', toneClass]">
    <i :class="['pi', icon]" />
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  tone: 'normal' | 'warning' | 'critical'
  icon: string
}>()

const toneClass = computed(() => `tone-${props.tone}`)
</script>

<style scoped>
.status-pill {
  border-radius: 999px;
  padding: 0.65rem 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 600;
}

.tone-normal {
  background: #dcfce7;
  color: #166534;
}

.tone-warning {
  background: #fef3c7;
  color: #92400e;
}

.tone-critical {
  background: #fee2e2;
  color: #991b1b;
}
</style>
