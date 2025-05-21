<template>
  <div v-if="player">

    <!-- <h1>{{ player }}</h1> -->
    <div v-for="run in player">
      {{ run }}
    </div>
  </div>
  <div v-else>
    <p>Chargement...</p>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const player = ref(null);

// Function to do the Api Call
const fetchPlayer = async (id) => {
  try {
    const response = await axios.get(`/api/getAllData/?days=5`);
    const runs = []
    // Pathing the response to only add the runs of the url id
    response.data.data.forEach(element => {
      // Insensitive Comparaison with lowercase() between url id and run nickanme 
      if (element.nickname.toLowerCase() == id.toLowerCase()) {
        runs.push(element)
      }
    });
    // Set the player value to all the runs found 
    player.value = runs;
  } catch (error) {
    console.error('Error loading:', error);
  }
};

// First loading
onMounted(() => {
  fetchPlayer(route.params.id);
});

// Reloading id without reloading the page
watch(() => route.params.id, (newId) => {
  fetchPlayer(newId);
});
</script>