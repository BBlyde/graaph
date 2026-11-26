<template>
    <section class="flex min-h-[calc(100vh-5rem)] items-center justify-center px-5 py-16">
        <div class="w-full max-w-xl">
            <p class="mb-4 text-center text-sm text-zinc-400">
                Compare two runners
            </p>
            <form class="w-full space-y-3" @submit.prevent="comparePlayers">
                <div class="flex border border-white/15 bg-[#151517] p-1.5 transition focus-within:border-primarry/70">
                    <div class="flex min-w-0 flex-1 items-center gap-3 pl-3 sm:pl-4">
                        <label for="versus-player-one" class="sr-only">First Minecraft username</label>
                        <input
                            id="versus-player-one"
                            v-model="playerOne"
                            autocomplete="off"
                            class="h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                            placeholder="First username"
                            type="text"
                        />
                    </div>
                </div>
                <div class="flex border border-white/15 bg-[#151517] p-1.5 transition focus-within:border-primarry/70">
                    <div class="flex min-w-0 flex-1 items-center gap-3 pl-3 sm:pl-4">
                        <label for="versus-player-two" class="sr-only">Second Minecraft username</label>
                        <input
                            id="versus-player-two"
                            v-model="playerTwo"
                            autocomplete="off"
                            class="h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                            placeholder="Second username"
                            type="text"
                        />
                    </div>
                </div>
                <button
                    class="inline-flex h-12 w-full items-center justify-center gap-2 bg-primarry px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="!playerOne.trim() || !playerTwo.trim()"
                    type="submit"
                >
                    Compare
                    <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
            </form>
        </div>
    </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const playerOne = ref('')
const playerTwo = ref('')

watch(
    () => [route.params.player1, route.params.player2],
    ([firstPlayer, secondPlayer]) => {
        playerOne.value = typeof firstPlayer === 'string' ? firstPlayer : ''
        playerTwo.value = typeof secondPlayer === 'string' ? secondPlayer : ''
    },
    { immediate: true }
)

function comparePlayers() {
    const firstPlayer = playerOne.value.trim()
    const secondPlayer = playerTwo.value.trim()
    if (!firstPlayer || !secondPlayer) return

    router.push({
        name: 'VersusPlayers',
        params: { player1: firstPlayer, player2: secondPlayer }
    })
}
</script>
