<template>
    <section class="flex min-h-[calc(100vh-5rem)] items-center justify-center px-5 py-16">
        <div class="relative w-full max-w-xl" @focusin="isSearchFocused = true" @focusout="handleSearchFocusOut">
            <p class="mb-4 text-center text-sm text-zinc-400">
                Enter a runner name to explore player stats
            </p>
            <form class="w-full" @submit.prevent="goToPlayer">
                <label for="player-username" class="sr-only">Minecraft username</label>
                <div class="flex border border-white/15 bg-[#151517] p-1.5 transition focus-within:border-primary/70">
                    <div class="flex min-w-0 flex-1 items-center gap-3 pl-3 sm:pl-4">
                        <svg aria-hidden="true" class="h-5 w-5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none">
                            <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7" />
                            <path d="m16 16 4.2 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                        </svg>
                        <input
                            id="player-username"
                            v-model="playerId"
                            autocomplete="off"
                            class="h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                            placeholder="username"
                            type="text"
                        />
                    </div>
                    <button
                        class="inline-flex h-12 shrink-0 items-center gap-2 bg-primary px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
                        :style="{ '--hover-color': 'var(--color-secondary)' }"
                        :disabled="!playerId.trim()"
                        type="submit"
                    >
                        Search
                        <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>
                </div>
            </form>

            <div
                v-if="isSearchFocused && (historyError || filteredRecentPlayers.length)"
                class="absolute inset-x-0 top-full z-20 mt-2 border border-white/10 bg-[#151517] shadow-xl shadow-black/30"
            >
                <p v-if="historyError" class="border-b border-red-900/60 px-4 py-3 text-sm text-red-200" role="alert">
                    {{ historyError }}
                </p>
                <template v-if="filteredRecentPlayers.length">
                    <h2 class="border-b border-white/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                        Recent players
                    </h2>
                    <ul class="search-history-scrollbar max-h-64 overflow-x-hidden overflow-y-auto">
                        <li v-for="player in filteredRecentPlayers" :key="player" class="border-b border-white/[0.06] last:border-b-0">
                            <router-link
                                :to="{ name: 'PlayerStats', params: { id: player } }"
                                @click="saveRecentPlayer(player)"
                                class="flex min-w-0 items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.03] hover:text-white focus-visible:bg-white/[0.03] focus-visible:outline-none"
                            >
                                <img
                                    :src="getRunnerHeadUrl(player)"
                                    :alt="`${player} runner head`"
                                    class="h-8 w-8 shrink-0 border border-white/10 object-cover"
                                />
                                <span class="truncate">{{ player }}</span>
                            </router-link>
                        </li>
                    </ul>
                </template>
            </div>
        </div>
    </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRunnerHeadUrl } from '@/services/playerService.js'

const router = useRouter()
const playerId = ref('')
const recentPlayers = ref([])
const filteredRecentPlayers = computed(() => {
    const query = playerId.value.trim().toLowerCase()
    return query
        ? recentPlayers.value.filter(player => player.toLowerCase().includes(query))
        : recentPlayers.value
})
const isSearchFocused = ref(false)
const historyError = ref('')
const storageKey = 'graaph:recent-player-searches'

function loadRecentPlayers() {
    try {
        const storedPlayers = localStorage.getItem(storageKey)
        if (storedPlayers === null) return

        const parsedPlayers = JSON.parse(storedPlayers)
        if (!Array.isArray(parsedPlayers) || parsedPlayers.some(player => typeof player !== 'string')) {
            throw new Error('Stored player history must be an array of names.')
        }

        const uniquePlayers = new Map()
        for (const player of parsedPlayers) {
            const name = player.trim()
            const normalizedName = name.toLowerCase()
            if (name && !uniquePlayers.has(normalizedName)) uniquePlayers.set(normalizedName, name)
        }
        recentPlayers.value = [...uniquePlayers.values()].slice(0, 10)
    } catch (error) {
        console.error('Unable to load recent player searches:', error)
        historyError.value = 'Unable to load recent player searches from this browser.'
    }
}

function saveRecentPlayer(name) {
    const updatedPlayers = [
        name,
        ...recentPlayers.value.filter(player => player.toLowerCase() !== name.toLowerCase())
    ].slice(0, 10)

    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedPlayers))
        recentPlayers.value = updatedPlayers
        historyError.value = ''
    } catch (error) {
        console.error('Unable to save recent player searches:', error)
        historyError.value = 'Unable to save recent player searches in this browser.'
    }
}

function goToPlayer() {
    const name = playerId.value.trim()
    if (!name) return

    saveRecentPlayer(name)
    router.push({ name: 'PlayerStats', params: { id: name } })
}

function handleSearchFocusOut(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        isSearchFocused.value = false
    }
}

onMounted(loadRecentPlayers)
</script>

<style scoped>
.search-history-scrollbar {
    scrollbar-color: #3f3f46 transparent;
    scrollbar-width: thin;
}

.search-history-scrollbar::-webkit-scrollbar {
    width: 8px;
}

.search-history-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.search-history-scrollbar::-webkit-scrollbar-thumb {
    background: #3f3f46;
    border: 2px solid #151517;
    border-radius: 9999px;
}

.search-history-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #52525b;
}
</style>
