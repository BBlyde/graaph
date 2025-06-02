<template>
  <div class="flex-row">
    <select v-model="selectedDays" @change="changeDay(selectedDays)" class="px-3 py-2 border rounded-md text-black">
      <option :value="1">24 Hours</option>
      <option :value="7">7 Days</option>
      <option :value="30">30 Days</option>
    </select>
    <div class="w-2xl">
      <div v-if="loading">Loading..</div>
      <div v-else-if="player">
        <BarChart :player="player" />
        <PlayerDetails :player="player" />
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
import { getAllDataByDay, trimAllDataByPlayerId } from '@/services/playerService.js'
import BarChart from '@/components/BarChart.vue'

const props = defineProps({
  id: String
})

const route = useRoute()
const player = ref(null)
const loading = ref(true)
const t = ref(true)
const day = ref(1)
const selectedDays = ref(1)

const fetchPlayer = async (id, day) => {

  loading.value = true
  try {
    const datas = await getAllDataByDay(day)
    const playerData = await trimAllDataByPlayerId(datas, id)
    console.log(playerData.data.bastion)
    if (playerData.data.bastion != undefined) {
      player.value = playerData
    }
  } catch (e) {
    player.value = null
  } finally {
    loading.value = false
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
