<template>
  <section class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
    <div class="space-y-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <PlayerDetails :advancedData="advancedData" />
        <div class="flex items-center gap-3">
          <label for="stats-period" class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Period</label>
          <div class="relative">
            <select id="stats-period" v-model="selectedDays"
              class="h-10 appearance-none border border-white/15 bg-[#151517] px-3 pr-9 text-sm text-white outline-none transition focus:border-primarry"
              @change="changeDay(selectedDays)">
              <option :value="1">24 Hours</option>
              <option :value="7">7 Days</option>
              <option :value="30">30 Days</option>
              <option :value="9999">All time</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      <div v-if="loading" class="border border-primarry bg-[#151517] px-5 py-4 text-sm text-zinc-300" role="status">
        LOADING GRAAPHS..
      </div>
      <div v-else-if="error" class="border border-red-500 bg-[#151517] px-5 py-4 text-sm text-red-200" role="alert">
        {{ error }}
      </div>
      <div v-else class="grid min-w-0 gap-4 lg:grid-cols-2">
        <article class="min-w-0 border border-white/10 bg-[#151517] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">SPLIT COUNTERS</h2>
            <p class="mt-1 text-xs text-zinc-500">
              Number of runs per split by period
            </p>
          </div>
          <BarChartSplitStats :key="selectedDays" :advancedData="advancedData" />
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div class="mb-4 border-b border-white/10 pb-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="self-start text-sm font-semibold text-zinc-100">SPLIT TIMINGS</h2>
              <div class="inline-flex shrink-0 border border-white/10 p-0.5" role="group"
                aria-label="Split time statistic">
                <button v-for="metric in splitTimeMetrics" :key="metric.value" type="button"
                  class="px-3 py-1.5 text-xs font-medium transition"
                  :class="selectedSplitMetric === metric.value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'"
                  :aria-pressed="selectedSplitMetric === metric.value" @click="selectedSplitMetric = metric.value">
                  {{ metric.label }}
                </button>
              </div>
            </div>
            <p class="mt-1 text-xs text-zinc-500 sm:-mt-2">
              {{ selectedSplitMetric === 'fastest' ? 'Fastest' : 'Average' }} split times by period
            </p>
          </div>
          <BarChartAvgFastestSplit :key="selectedDays" :advancedData="advancedData" :selectedMetric="selectedSplitMetric" />
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">SPLIT AVERAGES</h2>
            <p class="mt-1 text-xs text-zinc-500">Individual split averages for each period</p>
          </div>
          <BarChartAvgSplit :key="route.params.id" :splitData="splitData" :segmentStats="segmentStats" />
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">SPLIT HEATMAP</h2>
            <p class="mt-1 text-xs text-zinc-500">Cumulative split averages across all periods</p>
          </div>
          <div class="mt-7">
            <SplitPeriodHeatmap :splitData="splitData" />
          </div>
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h2 class="text-sm font-semibold text-zinc-100">SPLIT DISTRIBUTION</h2>
            <p class="mt-1 text-xs text-zinc-500">Spread of individual split times by period</p>
          </div>
          <BoxPlotChartSplitDistribution :key="selectedDays" :segmentTimes="segmentTimes" :selectedDays="selectedDays" />
        </article>

        <article class="min-w-0 border border-white/10 bg-[#151517] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div class="mb-4 border-b border-white/10 pb-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-zinc-100">DAILY ENTERS</h2>
              <div class="relative">
                <label for="daily-enters-year" class="sr-only">Daily enters year</label>
                <select
                  id="daily-enters-year"
                  v-model.number="netherYear"
                  class="h-8 appearance-none border border-white/15 bg-[#151517] px-3 pr-8 text-sm text-white outline-none transition focus:border-primarry"
                >
                  <option v-for="year in netherYears" :key="year" :value="year">{{ year }}</option>
                </select>
                <svg
                  class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
            <p class="mt-1 text-xs text-zinc-500">Daily nether entries</p>
          </div>
          <NetherContributionHeatmap :key="netherYear" :runs="netherEntries" :year="netherYear" />
        </article>

      </div>

      <article v-if="!loading" class="min-w-0 border border-white/10 bg-[#151517] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
        <div class="mb-4 border-b border-white/10 pb-3">
          <h2 class="text-sm font-semibold text-zinc-100">PERSONAL BEST HISTORY</h2>
          <p class="mt-1 text-xs text-zinc-500">Progression of personal best times over time</p>
        </div>
        <PlayerProgressionChart :records="progressionRecords" :loading="progressionLoading" :error="progressionError" />
      </article>
    </div>

  </section>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PlayerDetails from '@/components/PlayerDetails.vue'
import { fetchDataPacemanApi, fetchPlayerRunHistory, fetchSharedSplitStats, getPlayerDataByDay, getPlayerCompletionStatsByDay, trimAllDataByPlayerId, getDataLeaderboardByPlayer, getMinecraftProfileName, getPlayerStatsForAllPeriods, uniqueSplitTimeAllPeriods } from '@/services/playerService.js'
import BarChartSplitStats from '@/components/BarChartSplitStats.vue'
import BarChartAvgFastestSplit from '@/components/BarChartAvgFastestSplit.vue'
import BarChartAvgSplit from '@/components/BarChartAvgSplit.vue'
import SplitPeriodHeatmap from '@/components/SplitPeriodHeatmap.vue'
import NetherContributionHeatmap from '@/components/NetherContributionHeatmap.vue'
import PlayerProgressionChart from '@/components/PlayerProgressionChart.vue'
import BoxPlotChartSplitDistribution from '@/components/BoxPlotChartSplitDistribution.vue'
import { fetchPlayerProgression } from '@/services/playerService.js'
const route = useRoute()
const playerSplits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']

function createEmptyPlayerStats(nickname) {
  const periodStats = getPlayerStatsForAllPeriods([], nickname)
  return {
    advancedData: {
      nickname: nickname.trim(),
      data: Object.fromEntries(playerSplits.map(split => [
        split,
        { sum: 0, avg: undefined, fastest: undefined, counter: 0 }
      ])),
      completionCount: 0,
      completionStats: { counter: 0 },
      place: undefined,
      completionTime: undefined,
      lastRun: null
    },
    splitData: uniqueSplitTimeAllPeriods(periodStats.splitData),
    segmentStats: periodStats.segmentStats,
    segmentTimes: periodStats.segmentTimes
  }
}

const initialPlayerStats = createEmptyPlayerStats(route.params.id)
const advancedData = ref(initialPlayerStats.advancedData)
const splitData = ref(initialPlayerStats.splitData)
const segmentStats = ref(initialPlayerStats.segmentStats)
const segmentTimes = ref(initialPlayerStats.segmentTimes)
const netherEntries = ref([])
const progressionRecords = ref([])
const progressionLoading = ref(true)
const progressionError = ref(false)
const loading = ref(true)
const error = ref('')
const day = ref(1)
const selectedDays = ref(1)
const currentYear = new Date().getFullYear()
const netherYear = ref(currentYear)
const netherYears = Array.from(
  { length: Math.max(1, currentYear - 2024 + 1) },
  (_, index) => currentYear - index
)
const selectedSplitMetric = ref('avg')
const splitTimeMetrics = [
  { value: 'avg', label: 'Average' },
  { value: 'fastest', label: 'Fastest' }
]
const selectedPeriodName = computed(() => {
  const periodLabels = {
    1: '24 hours',
    7: '7 days',
    30: '30 days',
    9999: 'all time'
  }
  return periodLabels[selectedDays.value]
})
let latestRequest = 0
let latestPeriodRequest = 0
let cachedPlayerData = null
let cachedPlayerId = ''
let cachedPlayerHasRuns = false
let cachedSharedRankings = new Map()
const rankingPeriods = [
  { days: 1, key: 'avg1d' },
  { days: 7, key: 'avg7d' },
  { days: 30, key: 'avg30d' },
  { days: 9999, key: 'avgAT' }
]

async function fetchSharedRankingsForPlayer(id) {
  const entries = await Promise.all(rankingPeriods.map(async ({ days }) => {
    try {
      return [days, await fetchSharedSplitStats(id, days)]
    } catch (rankingError) {
      console.error(`Unable to load shared AA rankings for ${days} days:`, rankingError)
      return [days, null]
    }
  }))
  return new Map(entries)
}

function applySharedPeriodStats(playerPeriodStats, sharedRankings) {
  const splitData = Object.fromEntries(
    Object.entries(playerPeriodStats.splitData).map(([split, periods]) => [split, { ...periods }])
  )
  const segmentStats = Object.fromEntries(
    Object.entries(playerPeriodStats.segmentStats).map(([segment, periods]) => [
      segment,
      Object.fromEntries(Object.entries(periods).map(([period, stats]) => [period, { ...stats }]))
    ])
  )

  for (const { days, key } of rankingPeriods) {
    const snapshot = sharedRankings.get(days)
    if (!snapshot) continue
    for (const [split, stats] of Object.entries(snapshot.stats)) {
      if (splitData[split]) splitData[split][key] = stats.avg
    }
    for (const [segment, stats] of Object.entries(snapshot.segments)) {
      if (segmentStats[segment]) segmentStats[segment][key] = stats
    }
  }
  return { splitData, segmentStats }
}

const getPlayerDataForPeriod = async (playerData, id, selectedDay, sharedRankings) => {
  const periodData = getPlayerDataByDay(playerData, selectedDay, id)
  const playerDataTrimmed = trimAllDataByPlayerId(periodData, id)
  const sharedRanking = sharedRankings.get(selectedDay)

  if (sharedRanking) {
    for (const [split, sharedStats] of Object.entries(sharedRanking.stats)) {
      const splitStats = playerDataTrimmed.data[split]
      if (!splitStats) continue
      Object.assign(splitStats, {
        avg: sharedStats.avg,
        counter: sharedStats.counter,
        fastest: sharedStats.fastest,
        lbAvg: sharedStats.lbAvg,
        lbCounter: sharedStats.lbCounter,
        lbFastest: sharedStats.lbFastest,
        lbConversion: sharedStats.lbConversion,
        conversion: sharedStats.conversion,
        sharedLeaderboard: true
      })
    }
  } else {
    for (const splitStats of Object.values(playerDataTrimmed.data)) {
      splitStats.lbAvg = undefined
      splitStats.lbCounter = undefined
      splitStats.lbFastest = undefined
      splitStats.lbConversion = undefined
      splitStats.sharedLeaderboard = false
    }
  }

  const requestedNickname = id.trim().toLowerCase()
  const playerRuns = playerData.filter(run =>
    typeof run?.nickname === 'string' &&
    run.nickname.trim().toLowerCase() === requestedNickname
  )

  const completionStats = sharedRanking
    ? sharedRanking.completionStats
    : getPlayerCompletionStatsByDay(playerRuns, selectedDay)
  return {
    ...playerDataTrimmed,
    completionCount: completionStats.counter,
    completionStats
  }
}

const fetchPlayer = async (id, day) => {
  const request = ++latestRequest
  latestPeriodRequest++
  const isSamePlayer = cachedPlayerData !== null && cachedPlayerId === id.trim().toLowerCase()
  const existingPlace = isSamePlayer ? advancedData.value.place : undefined
  const existingCompletionTime = isSamePlayer ? advancedData.value.completionTime : undefined
  cachedPlayerData = null
  cachedPlayerId = ''
  cachedPlayerHasRuns = false
  cachedSharedRankings = new Map()
  if (!isSamePlayer) {
    const emptyStats = createEmptyPlayerStats(id)
    advancedData.value = emptyStats.advancedData
    splitData.value = emptyStats.splitData
    segmentStats.value = emptyStats.segmentStats
    segmentTimes.value = emptyStats.segmentTimes
  }
  netherEntries.value = []
  progressionRecords.value = []
  progressionLoading.value = true
  progressionError.value = false
  error.value = ''
  loading.value = true

  try {
    const leaderboardRequest = isSamePlayer
      ? Promise.resolve({ leaderboard: null })
      : getDataLeaderboardByPlayer(id).then(
        leaderboard => ({ leaderboard }),
        error => ({ error })
      )
    const [globalDataResult, playerRunsResult, profileResult, progressionResult, leaderboardResult] = await Promise.all([
      fetchDataPacemanApi().then(
        data => ({ data }),
        error => ({ error })
      ),
      fetchPlayerRunHistory(id).then(
        runs => ({ runs }),
        error => ({ error })
      ),
      getMinecraftProfileName(id).then(
        name => ({ name }),
        error => ({ error })
      ),
      fetchPlayerProgression(id).then(
        records => ({ records }),
        error => ({ error })
      ),
      leaderboardRequest
    ])
    if (request !== latestRequest) return
    if ('error' in globalDataResult) {
      console.error('Unable to load Paceman all-player data:', globalDataResult.error)
    }
    if ('error' in playerRunsResult) {
      console.error('Unable to load Paceman player history:', playerRunsResult.error)
    }
    if ('error' in progressionResult) {
      console.error('Unable to load player progression:', progressionResult.error)
      progressionError.value = true
    } else {
      progressionRecords.value = progressionResult.records
    }
    progressionLoading.value = false

    const globalData = 'data' in globalDataResult ? globalDataResult.data : []
    const playerRuns = 'runs' in playerRunsResult ? playerRunsResult.runs : []
    const playerData = playerRuns.length
      ? [
        ...globalData.filter(run => run.nickname.trim().toLowerCase() !== id.trim().toLowerCase()),
        ...playerRuns
      ]
      : globalData
    const requestedNickname = id.trim().toLowerCase()
    let hasPlayerRuns = false
    let lastRun = null
    const playerNetherEntries = []
    for (const run of playerData) {
      if (typeof run?.nickname !== 'string' || run.nickname.trim().toLowerCase() !== requestedNickname) continue
      hasPlayerRuns = true
      if (!Number.isFinite(run.nether) || run.nether <= 0) continue

      playerNetherEntries.push(run)
      if (!lastRun || run.insertTime > lastRun) lastRun = run.insertTime
    }
    if (hasPlayerRuns) netherEntries.value = playerNetherEntries

    cachedSharedRankings = hasPlayerRuns
      ? await fetchSharedRankingsForPlayer(id)
      : new Map()
    const playerDataTrimmed = hasPlayerRuns
      ? await getPlayerDataForPeriod(playerData, id, day, cachedSharedRankings)
      : createEmptyPlayerStats(id).advancedData
    if (request !== latestRequest) return

    const playerPeriodStats = getPlayerStatsForAllPeriods(hasPlayerRuns ? playerData : [], id)
    const sharedPeriodStats = applySharedPeriodStats(playerPeriodStats, cachedSharedRankings)

    // Build the unique time of each split for all periods
    const eachSplitTimeAllPeriod = uniqueSplitTimeAllPeriods(sharedPeriodStats.splitData) // Avg Split Time BarChart

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
      completionTime: existingCompletionTime,
      lastRun
    }
    splitData.value = eachSplitTimeAllPeriod
    segmentStats.value = sharedPeriodStats.segmentStats
    segmentTimes.value = playerPeriodStats.segmentTimes

    if (!isSamePlayer) {
      if ('error' in leaderboardResult) {
        console.error('Unable to load leaderboard:', leaderboardResult.error)
        nextAdvancedData.place = undefined
        nextAdvancedData.completionTime = undefined
      } else if (!hasPlayerRuns && progressionRecords.value.length === 0) {
        nextAdvancedData.place = undefined
        nextAdvancedData.completionTime = undefined
      } else {
        nextAdvancedData.place = leaderboardResult.leaderboard?.place
        nextAdvancedData.completionTime = leaderboardResult.leaderboard?.completionTime
      }
    }

    if (request === latestRequest) {
      advancedData.value = nextAdvancedData
      cachedPlayerData = playerData
      cachedPlayerId = id.trim().toLowerCase()
      cachedPlayerHasRuns = hasPlayerRuns
    }
  } catch (e) {
    console.error('Unable to load player statistics:', e)
    if (request === latestRequest) error.value = 'Unable to load player statistics. Please try again later.'
  } finally {
    if (request === latestRequest) {
      loading.value = false
      progressionLoading.value = false
    }
  }
}

async function changeDay(newDay) {
  if (newDay === day.value) return
  day.value = newDay

  const id = route.params.id
  if (cachedPlayerData !== null && cachedPlayerId === id.trim().toLowerCase()) {
    if (!cachedPlayerHasRuns) return

    const periodRequest = ++latestPeriodRequest
    loading.value = true
    error.value = ''
    try {
      const playerDataTrimmed = await getPlayerDataForPeriod(
        cachedPlayerData,
        id,
        day.value,
        cachedSharedRankings
      )
      if (periodRequest !== latestPeriodRequest || cachedPlayerId !== id.trim().toLowerCase()) return
      advancedData.value = {
        ...advancedData.value,
        data: playerDataTrimmed.data,
        completionCount: playerDataTrimmed.completionCount,
        completionStats: playerDataTrimmed.completionStats
      }
    } catch (periodError) {
      console.error('Unable to load player statistics for the selected period:', periodError)
      if (periodRequest === latestPeriodRequest) {
        error.value = 'Unable to load player statistics. Please try again later.'
      }
    } finally {
      if (periodRequest === latestPeriodRequest) loading.value = false
    }
    return
  }

  fetchPlayer(id, day.value)
}

onMounted(() => {
  fetchPlayer(route.params.id, day.value)
})

watch(() => route.params.id, (newId) => {
  fetchPlayer(newId, day.value)
})
</script>
