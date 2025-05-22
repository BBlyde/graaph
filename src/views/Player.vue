<template>
  <div v-if="datas">

    <h1>{{ datas[0].nickname }}</h1>
    <LineChart :chartData="data" :chartOptions="options" />
    <div v-for="run in datas">
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
import LineChart from '@/components/LineChart.vue';

const data = {
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [{
    label: 'Ventes',
    data: [40, 20, 60],
    backgroundColor: 'rgba(75, 192, 192, 0.2)',
    borderColor: 'rgba(75, 192, 192, 1)',
    borderWidth: 1
  }]
};

const options = {
  responsive: true,
  plugins: {
    legend: { position: 'top' },
    title: { display: true, text: 'Graphique mensuel' }
  }
};

const route = useRoute();
const datas = ref(null);

// Function to do the Api Call
const fetchPlayer = async (id) => {
  try {
    const response = await axios.get(`/api/getAllData/?days=1`);
    const runs = []
    console.log(response);
    // Pathing the response to only add the runs of the url id
    response.data.data.forEach(element => {
      // Insensitive Comparaison with lowercase() between url id and run nickname 
      if (element.nickname.toLowerCase() == id.toLowerCase()) {
        runs.push(element)
      }
    });
    // Set the player value to all the runs found 
    datas.value = runs;
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