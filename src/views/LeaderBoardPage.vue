<template>
  <section class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
    <header class="mx-auto mb-6 flex max-w-3xl flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold text-white sm:text-3xl">AA / {{ selectedBoard === 'rsg' ? 'RSG' : 'Thunderless' }} Leaderboard</h1>
        <p class="mt-2 text-sm text-zinc-400">Full ranking from Totorewa's leaderboard API.</p>
      </div>
      <div class="flex justify-end">
        <div class="inline-flex border border-white/10 p-0.5" role="group" aria-label="Leaderboard board">
          <button
            v-for="board in leaderboardBoards"
            :key="board.value"
            type="button"
            class="px-3 py-1.5 text-xs font-medium transition"
            :class="selectedBoard === board.value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'"
            :aria-pressed="selectedBoard === board.value"
            :disabled="loading"
            @click="selectBoard(board.value)"
          >
            {{ board.label }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="loading" class="mx-auto max-w-3xl border border-white/10 border-l-2 border-l-primarry bg-[#151517] px-5 py-4 text-sm text-zinc-300" role="status">
      Loading leaderboard...
    </div>
    <div v-else-if="error" class="border border-red-900/60 border-l-2 border-l-red-500 bg-[#151517] px-5 py-4 text-sm text-red-200" role="alert">
      {{ error }}
    </div>
    <div v-else-if="results.length" class="mx-auto max-w-3xl overflow-x-auto border border-white/10 bg-[#151517]">
      <table class="w-full min-w-[32rem] text-left text-sm">
        <thead class="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th scope="col" class="w-16 py-3 pl-4 pr-2 font-medium">#</th>
            <th scope="col" class="px-2 py-3 font-medium">Player</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          <tr
            v-for="(result, index) in results"
            :key="index"
            role="link"
            tabindex="0"
            :aria-label="`Open stats for ${result.players.join(', ')}`"
            class="cursor-pointer text-zinc-200 transition-colors hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primarry"
            :class="index % 2 === 0 ? 'bg-white/[0.025]' : 'bg-transparent'"
            @click="openPlayerStats(result)"
            @keydown.enter.prevent="openPlayerStats(result)"
            @keydown.space.prevent="openPlayerStats(result)"
          >
            <td class="py-3 pl-4 pr-2 font-semibold" style="color: var(--color-primarry)">{{ result.place }}</td>
            <td class="px-2 py-3">
              <span v-for="(player, playerIndex) in result.players" :key="player" class="inline-flex items-center gap-2">
                <span v-if="playerIndex > 0" class="mx-1 text-zinc-500">,</span>
                <img
                  :src="getRunnerHeadUrl(player)"
                  :alt="`${player} runner head`"
                  class="h-8 w-8 shrink-0 border border-white/10 object-cover"
                />
                <span class="font-medium text-white">{{ player }}</span>
              </span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums" style="color: var(--color-primarry)">{{ result.completionTime }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="border border-white/10 border-l-2 border-l-zinc-500 bg-[#151517] px-5 py-4 text-sm text-zinc-400" role="status">
      No leaderboard entries available.
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAllLeaderboardData, getRunnerHeadUrl } from '@/services/playerService.js'

const router = useRouter()
const results = ref([])
const loading = ref(false)
const error = ref('')
const selectedBoard = ref('rsg')
const leaderboardBoards = [
  { value: 'rsg', label: 'RSG' },
  { value: 'thunderless', label: 'Thunderless' }
]
let latestLeaderboardRequest = 0

function openPlayerStats(result) {
  const player = result.players[0]
  if (player) router.push({ name: 'PlayerStats', params: { id: player } })
}

function selectBoard(board) {
  if (board === selectedBoard.value || loading.value) return
  selectedBoard.value = board
  loadLeaderboard(board)
}

async function loadLeaderboard(board = selectedBoard.value) {
  const request = ++latestLeaderboardRequest
  loading.value = true
  error.value = ''

  try {
    const leaderboard = await getAllLeaderboardData(board)
    if (request === latestLeaderboardRequest) results.value = leaderboard
  } catch (e) {
    console.error('Unable to load leaderboard:', e)
    if (request === latestLeaderboardRequest) error.value = 'Unable to load the leaderboard. Please try again later.'
  } finally {
    if (request === latestLeaderboardRequest) loading.value = false
  }
}

onMounted(loadLeaderboard)
</script>
