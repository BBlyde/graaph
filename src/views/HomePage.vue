<template>
    <div class="flex-row justify-items-center py-20">
        <div class="flex-row">
            <span class="text-xl">Search a <span class="text-primary">Player</span> :</span>
            <div>
                <input name="searchPlayer" class="my-2 bg-white text-black w-xs text-2xl text-center rounded-lg"
                    v-model="playerId" @keyup.enter="goToPlayer" placeholder='Username' />
            </div>
        </div>
        <div class="my-10">
            <h1 class="text-xl underline">
                Hello world!
            </h1>
        </div>
    </div>
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