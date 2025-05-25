<template>
  <div v-if="loading">Loading..</div>
  <div v-else-if="player">
    <PlayerDetails :player="player" />
  </div>
  <div v-else>
    Player not found
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PlayerDetails from '@/components/PlayerDetails.vue'
import { getPlayerById } from '@/services/playerService.js'

const route = useRoute()
const player = ref(null)
const loading = ref(true)

const fetchPlayer = async (id) => {
  loading.value = true
  try {
    player.value = await getPlayerById(id)
  } catch (e) {
    player.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPlayer(route.params.id)
})

watch(() => route.params.id, (newId) => {
  fetchPlayer(newId)
})
</script>
