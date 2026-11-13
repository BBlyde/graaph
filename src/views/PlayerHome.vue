<template>
    <section class="flex min-h-[calc(100vh-5rem)] items-center justify-center px-5 py-16">
        <form class="w-full max-w-xl" @submit.prevent="goToPlayer">
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
                    class="inline-flex h-12 shrink-0 items-center gap-2 bg-primary px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
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
    </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const playerId = ref('')

function goToPlayer() {
    if (playerId.value.trim() !== '') {
        router.push(`/player/${playerId.value.trim()}`)
    }
}
</script>
