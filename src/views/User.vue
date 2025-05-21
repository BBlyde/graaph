<template>
    {{  id }}
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const props = defineProps(['id'])

onMounted(async () => {
  try {
    const response = await axios.get('/api/getAllData/?days=1')
    console.log(response.data.data)
  } catch (error) {
    console.error('Error :', error)
  }
})
</script>