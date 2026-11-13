<template>
  <div class="flex-row">
    <select v-model="selectedDays" @change="changeDay(selectedDays)" class="px-3 py-2 border rounded-md text-black">
      <option :value="1">24 Hours</option>
      <option :value="7">7 Days</option>
      <option :value="30">30 Days</option>
    </select>
    <div class="w-2xl">
      <div v-if="loading">Loading..</div>
      <div v-else-if="error" role="alert">{{ error }}</div>
      <div v-else-if="advancedData">
        <div v-if="leaderboardError" role="alert">{{ leaderboardError }}</div>
        <BarChartSplitStats :advancedData="advancedData" />
        <BarChartAvgSplit :splitData="splitData" />
        <LineChartAvgFastest :advancedData="advancedData" />
        <LineChartComplex :deltaData="deltaData" />
        <PlayerDetails :advancedData="advancedData" />
      </div>
      <div v-else>
        No data for the player
      </div>
    </div>
  </div>
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
