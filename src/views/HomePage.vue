<template>
    Graaph
    <input v-model="playerId" @keyup.enter="goToPlayer" placeholder="Username" />
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