<template>
  <div class="flex min-w-0 flex-1 items-end justify-between gap-6">
    <div class="min-w-0">
      <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Player profile</p>
      <h1 class="truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">{{ props.advancedData.nickname }}</h1>
    </div>
    <div class="shrink-0 border border-white/10 bg-[#151517] px-4 py-2.5">
      <p class="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Overall rank</p>
      <p class="mt-1 text-lg font-semibold tabular-nums text-emerald-400">{{ rankLabel }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  advancedData: {
    type: Object,
    required: true
  }
})

const rankLabel = computed(() => {
  if (props.advancedData.place === undefined) return 'N/A'
  if (props.advancedData.place === null) return 'UNRANKED'
  return `#${props.advancedData.place}`
})
</script>
