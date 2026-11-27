<template>
    <section class="flex min-h-[calc(100vh-5rem)] items-start justify-center px-5 py-12 sm:py-16">
        <div class="w-full max-w-2xl">
            <img src="@/assets/logo_only.png" alt="Graaph" class="mx-auto mb-7 h-20 w-auto sm:h-24" />
            <h1 class="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                VERSUS
            </h1>
            <p class="mt-3 text-center text-sm text-zinc-400 sm:text-base">
                Enter two runner names to compare their statistics
            </p>
            <form class="mt-8 w-full space-y-3" @submit.prevent="comparePlayers">
                <div class="flex border border-white/15 bg-[#151517] p-1.5 transition-colors focus-within:border-primarry">
                    <div class="flex min-w-0 flex-1 items-center">
                        <label for="versus-player-one" class="sr-only">First Minecraft username</label>
                        <input
                            id="versus-player-one"
                            v-model="playerOne"
                            autocomplete="off"
                            class="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-white outline-none placeholder:text-zinc-600 sm:px-4"
                            placeholder="username player 1"
                            type="text"
                        />
                    </div>
                </div>
                <div class="flex border border-white/15 bg-[#151517] p-1.5 transition-colors focus-within:border-primarry">
                    <div class="flex min-w-0 flex-1 items-center">
                        <label for="versus-player-two" class="sr-only">Second Minecraft username</label>
                        <input
                            id="versus-player-two"
                            v-model="playerTwo"
                            autocomplete="off"
                            class="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-white outline-none placeholder:text-zinc-600 sm:px-4"
                            placeholder="username player 2"
                            type="text"
                        />
                    </div>
                </div>
                <button
                    class="inline-flex h-12 w-full items-center justify-center gap-2 bg-primarry px-5 text-sm font-semibold text-white transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primarry disabled:cursor-not-allowed disabled:opacity-40"
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
