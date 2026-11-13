<template>
  <div class="flex min-w-0 items-center gap-4">
    <router-link
      :to="{ name: 'PlayerHome' }"
      aria-label="Back to player search"
      class="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-[#151517] text-zinc-400 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M19 12H5m7 7-7-7 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </router-link>
    <img
      :src="runnerHeadUrl"
      :alt="`${props.advancedData.nickname} runner head`"
      class="h-12 w-12 shrink-0 border border-white/10 object-cover sm:h-14 sm:w-14"
    />
    <div class="min-w-0">
      <h1 class="flex min-w-0 items-baseline gap-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        <span class="min-w-0 truncate">{{ props.advancedData.nickname }}</span>
        <span v-if="rankLabel" class="group relative inline-flex shrink-0">
          <span
            :aria-describedby="completionTime ? completionTimeTooltipId : undefined"
            :tabindex="completionTime ? 0 : undefined"
            class="cursor-help text-lg font-medium text-zinc-400 outline-none focus-visible:outline-2 focus-visible:outline-primary sm:text-xl"
            style="color: var(--color-secondary)"
          >
            {{ rankLabel }}
          </span>
          <span
            v-if="completionTime"
            :id="completionTimeTooltipId"
            class="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 border border-white/15 bg-[#101011] px-3 py-2 text-center text-xs font-medium text-zinc-200 shadow-lg group-hover:visible group-focus-within:visible"
            role="tooltip"
          >
            PB :<span class="ml-1" style="color: var(--color-secondary)">{{ completionTime }}</span>
          </span>
        </span>
      </h1>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getRunnerHeadUrl } from '@/services/playerService.js'

const props = defineProps({
  advancedData: {
    type: Object,
    required: true
  }
})

const runnerHeadUrl = computed(() => getRunnerHeadUrl(props.advancedData.nickname))
const completionTime = computed(() => props.advancedData.completionTime)
const completionTimeTooltipId = 'player-completion-time-tooltip'

const rankLabel = computed(() => {
  if (props.advancedData.place === undefined) return null
  if (props.advancedData.place === null) return 'UNRANKED'
  return `#${props.advancedData.place}`
})
</script>
