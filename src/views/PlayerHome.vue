<template>
    <span class="text-xl">Search a <span class="text-primary">Player</span> :</span>
    <input name="searchPlayer" class="my-2 bg-white text-black w-xs text-2xl text-center rounded-lg" v-model="playerId"
        @keyup.enter="goToPlayer" placeholder='Username' />
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