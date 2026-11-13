<template>
  <section class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
    <div v-if="loading && !advancedData" class="border border-white/10 border-l-2 border-l-primary bg-[#151517] px-5 py-4 text-sm text-zinc-300">
      Loading player statistics...
    </div>
    <div v-else-if="error && !advancedData" class="border border-red-900/60 border-l-2 border-l-red-500 bg-[#151517] px-5 py-4 text-sm text-red-200" role="alert">
      {{ error }}
    </div>
    <div v-else-if="advancedData" class="space-y-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <PlayerDetails :advancedData="advancedData" />
        <div class="flex items-center gap-3">
          <label for="stats-period" class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Period</label>
          <div class="relative">
            <select
              id="stats-period"
              v-model="selectedDays"
              class="h-10 appearance-none border border-white/15 bg-[#151517] px-3 pr-9 text-sm text-white outline-none transition focus:border-primary"
              @change="changeDay(selectedDays)"
            >
              <option :value="1">24 Hours</option>
              <option :value="7">7 Days</option>
              <option :value="30">30 Days</option>
            </select>
            <svg
              class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      <div v-if="loading" class="border border-white/10 border-l-2 border-l-primary bg-[#151517] px-5 py-4 text-sm text-zinc-300" role="status">
        Loading statistics for this period...
      </div>
      <div v-else-if="error" class="border border-red-900/60 border-l-2 border-l-red-500 bg-[#151517] px-5 py-4 text-sm text-red-200" role="alert">
        {{ error }}
      </div>
      <div v-else-if="hasPeriodData" class="grid min-w-0 gap-4 lg:grid-cols-2">
        <article class="min-w-0 border border-white/10 bg-[#151517] p-4 sm:p-5">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">Runs by split</h2>
            <p class="mt-1 text-xs text-zinc-500">Run count, average, and fastest time</p>
          </div>
          <BarChartSplitStats :advancedData="advancedData" />
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] p-4 sm:p-5">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">Split averages across time</h2>
            <p class="mt-1 text-xs text-zinc-500">24 hours, 7 days, 30 days, and all time</p>
          </div>
          <BarChartAvgSplit :splitData="splitData" />
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] p-4 sm:p-5">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">Average vs. fastest</h2>
            <p class="mt-1 text-xs text-zinc-500">Performance by split for the selected period</p>
          </div>
          <LineChartAvgFastest :advancedData="advancedData" />
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] p-4 sm:p-5">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">Progress toward best averages</h2>
            <p class="mt-1 text-xs text-zinc-500">Difference from each split's lowest average</p>
          </div>
          <LineChartComplex :deltaData="deltaData" />
        </article>
      </div>
      <div v-else class="border border-white/10 border-l-2 border-l-zinc-500 bg-[#151517] px-5 py-4 text-sm text-zinc-400" role="status">
        No runs found for the selected period.
      </div>
    </div>
    <div v-else class="border border-white/10 bg-[#151517] px-5 py-8 text-sm text-zinc-400">
      No data for this player.
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PlayerDetails from '@/components/PlayerDetails.vue'
import { fetchDataPacemanApi, getPlayerDataByDay, trimAllDataByPlayerId, getDataLeaderboardByPlayer, getMinecraftProfileName, getPlayerDataForAllPeriod, setEachAvgTimeToLowestBySplit, uniqueSplitTimeAllPeriods } from '@/services/playerService.js'
import BarChartSplitStats from '@/components/BarChartSplitStats.vue'
import BarChartAvgSplit from '@/components/BarChartAvgSplit.vue'
import LineChartAvgFastest from '@/components/LineChartAvgFastest.vue'
import LineChartComplex from '@/components/LineChartComplex.vue'
const route = useRoute()
const advancedData = ref(null)
const splitData = ref(null)
const deltaData = ref(null)
const hasPeriodData = ref(false)
const loading = ref(true)
const error = ref('')
const day = ref(1)
const selectedDays = ref(1)
let latestRequest = 0

const fetchPlayer = async (id, day) => {
  const request = ++latestRequest
  const isSamePlayer = id.trim().toLowerCase() === advancedData.value?.nickname?.trim().toLowerCase()
  const existingPlace = isSamePlayer ? advancedData.value.place : undefined
  const existingCompletionTime = isSamePlayer ? advancedData.value.completionTime : undefined
  if (!isSamePlayer) advancedData.value = null
  splitData.value = null
  deltaData.value = null
  hasPeriodData.value = false
  error.value = ''
  loading.value = true

  try {
    const [data, profileResult] = await Promise.all([
      fetchDataPacemanApi(),
      getMinecraftProfileName(id).then(
        name => ({ name }),
        error => ({ error })
      )
    ])

    // Advanced BarChartBuild the data for the said player as long as all the leaderboards for avgs, fastest and numbers
    const playerData = getPlayerDataByDay(data, day)
    const playerDataTrimmed = trimAllDataByPlayerId(playerData, id) // Advanced BarChart

    // Build the average data for the said player with all time periods    
    const playerDataAllPeriod = await getPlayerDataForAllPeriod(data, id)

    // Build the unique time of each split for all periods
    const eachSplitTimeAllPeriod = uniqueSplitTimeAllPeriods(playerDataAllPeriod) // Avg Split Time BarChart

    // Build the delta from fastest avg array for all periods
    const deltas = setEachAvgTimeToLowestBySplit(playerDataAllPeriod) // Complex LineChart

    if (request !== latestRequest) return

    let displayName = id.trim()
    if ('error' in profileResult) {
      console.error('Unable to load Minecraft profile:', profileResult.error)
    } else {
      displayName = profileResult.name
    }

    const nextAdvancedData = {
      ...playerDataTrimmed,
      nickname: displayName,
      place: existingPlace,
      completionTime: existingCompletionTime
    }
    splitData.value = eachSplitTimeAllPeriod
    deltaData.value = deltas
    hasPeriodData.value = Object.values(playerDataTrimmed.data).some(split => split?.counter > 0)

    if (!isSamePlayer) {
      try {
        const leaderboard = await getDataLeaderboardByPlayer(id)
        if (request === latestRequest) {
          nextAdvancedData.place = leaderboard?.place
          nextAdvancedData.completionTime = leaderboard?.completionTime
        }
      } catch (e) {
        console.error('Unable to load leaderboard:', e)
        if (request === latestRequest) {
          nextAdvancedData.place = undefined
          nextAdvancedData.completionTime = undefined
        }
      }
    }

    if (request === latestRequest) advancedData.value = nextAdvancedData
  } catch (e) {
    console.error('Unable to load player statistics:', e)
    if (request === latestRequest) error.value = 'Unable to load player statistics. Please try again later.'
  } finally {
    if (request === latestRequest) loading.value = false
  }
}

function changeDay(newDay) {
  if (newDay !== day.value) {
    day.value = newDay
    fetchPlayer(route.params.id, day.value)
  }
}

onMounted(() => {
  fetchPlayer(route.params.id, day.value)
})

watch(() => route.params.id, (newId) => {
  fetchPlayer(newId, day.value)
})
</script>
