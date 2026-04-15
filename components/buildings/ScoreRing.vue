<template>
  <div class="score-ring" :class="scoreClass">
    <div class="score-ring__value">{{ scoreText }}</div>
    <small>{{ label }}</small>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { scoreLabel } from '~/composables/useBuildingTrust'

const props = defineProps<{
  score: number
}>()

const roundedScore = computed(() => Math.round(props.score || 0))
const scoreText = computed(() => roundedScore.value.toString())
const label = computed(() => scoreLabel(props.score || 0))

const scoreClass = computed(() => {
  if (props.score >= 85) {
    return 'is-excellent'
  }

  if (props.score >= 70) {
    return 'is-strong'
  }

  if (props.score >= 50) {
    return 'is-fair'
  }

  return 'is-needs-attention'
})
</script>

<style scoped>
.score-ring {
  width: 94px;
  height: 94px;
  border-radius: 50%;
  border: 6px solid var(--color-soft-linen-200);
  display: grid;
  place-items: center;
  background: var(--color-soft-linen-50);
  color: var(--color-carbon-black-800);
  flex-shrink: 0;
}

.score-ring__value {
  font-size: 1.4rem;
  line-height: 1;
  font-weight: 700;
}

.score-ring small {
  font-size: 0.67rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-carbon-black-500);
}

.score-ring.is-excellent {
  border-color: #22c55e;
}

.score-ring.is-strong {
  border-color: var(--color-indigo-velvet-500);
}

.score-ring.is-fair {
  border-color: var(--color-sunflower-gold-500);
}

.score-ring.is-needs-attention {
  border-color: #ef4444;
}
</style>
