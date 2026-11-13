<template>
  <section class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
    <div v-if="loading" class="border border-white/10 border-l-2 border-l-primary bg-[#151517] px-5 py-4 text-sm text-zinc-300">
      Loading player statistics...
    </div>
    <div v-else-if="error" class="border border-red-900/60 border-l-2 border-l-red-500 bg-[#151517] px-5 py-4 text-sm text-red-200" role="alert">
      {{ error }}
    </div>
    <div v-else-if="advancedData" class="space-y-6">
      <div v-if="leaderboardError" class="border border-amber-900/60 border-l-2 border-l-amber-500 bg-[#151517] px-5 py-3 text-sm text-amber-200" role="alert">
        {{ leaderboardError }}
      </div>

      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <PlayerDetails :advancedData="advancedData" />
        <div class="flex items-center gap-3">
          <label for="stats-period" class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Period</label>
          <select
            id="stats-period"
            v-model="selectedDays"
            class="h-10 border border-white/15 bg-[#151517] px-3 text-sm text-white outline-none transition focus:border-primary"
            @change="changeDay(selectedDays)"
          >
            <option :value="1">24 Hours</option>
            <option :value="7">7 Days</option>
            <option :value="30">30 Days</option>
          </select>
        </div>
      </div>

      <div class="grid min-w-0 gap-4 lg:grid-cols-2">
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
import { fetchDataPacemanApi, getPlayerDataByDay, trimAllDataByPlayerId, getDataLeaderboardByPlayer, getPlayerDataForAllPeriod, setEachAvgTimeToLowestBySplit, uniqueSplitTimeAllPeriods } from '@/services/playerService.js'
import BarChartSplitStats from '@/components/BarChartSplitStats.vue'
import BarChartAvgSplit from '@/components/BarChartAvgSplit.vue'
import LineChartAvgFastest from '@/components/LineChartAvgFastest.vue'
import LineChartComplex from '@/components/LineChartComplex.vue'
const route = useRoute()
const advancedData = ref(null)
const splitData = ref(null)
const deltaData = ref(null)
const loading = ref(true)
const error = ref('')
const leaderboardError = ref('')
const day = ref(1)
const selectedDays = ref(1)
let latestRequest = 0

const fetchPlayer = async (id, day) => {
  const request = ++latestRequest
  advancedData.value = null
  splitData.value = null
  deltaData.value = null
  error.value = ''
  leaderboardError.value = ''
  loading.value = true

  try {
    // Get Data From Paceman API
    const data = await fetchDataPacemanApi()

    // Advanced BarChartBuild the data for the said player as long as all the leaderboards for avgs, fastest and numbers
    const playerData = getPlayerDataByDay(data, day)
    const playerDataTrimmed = trimAllDataByPlayerId(playerData, id) // Advanced BarChart

    // Build the average data for the said player with all time periods    
    const playerDataAllPeriod = await getPlayerDataForAllPeriod(data, id)

    // Build the unique time of each split for all periods
    const eachSplitTimeAllPeriod = uniqueSplitTimeAllPeriods(playerDataAllPeriod) // Avg Split Time BarChart

    // Build the delta from fastest avg array for all periods
    const deltas = setEachAvgTimeToLowestBySplit(playerDataAllPeriod) // Complex LineChart

    // Making sure at least one run was played
    if (Object.values(playerDataTrimmed.data).some(split => split?.counter > 0) && request === latestRequest) {
      // Setting each stored datas into the props
      advancedData.value = playerDataTrimmed // Advanced BarChart & Avg/Fastest LineChart
      splitData.value = eachSplitTimeAllPeriod // Avg Split Time BarChart
      deltaData.value = deltas  // Complex LineChart
      loading.value = false

      try {
        const place = await getDataLeaderboardByPlayer(id)
        if (request === latestRequest) advancedData.value.place = place
      } catch (e) {
        console.error('Unable to load leaderboard:', e)
        if (request === latestRequest) leaderboardError.value = 'Leaderboard unavailable; player statistics are still shown.'
      }
    }
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
