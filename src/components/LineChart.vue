// components/LineChart.vue
<script setup>
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement,
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

const props = defineProps({
  chartData: Object,
  chartOptions: Object
});
</script>

<template>
  <Line :data="chartData" :options="chartOptions" />
</template>
