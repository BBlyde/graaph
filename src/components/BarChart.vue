<template>
    <Bar :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
    player: {
        type: Object,
        required: true
    }
})

const counters = props.player.counters
const chartData = {
    labels: ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits'],
    datasets: [
        {
            data: [counters.counterNether, counters.counterBastion, counters.counterFortress, counters.counterStronghold, counters.counterEnd, counters.counterElytra, counters.counterCredits],
            backgroundColor: ['#512020', '#1e1b21', '#46262c', '#686b68', '#eef6b4', '#a170a0', '#366a5e']
        },
    ]
}

const chartOptions = {
    responsive: true,
    plugins: {
        legend: {
            display: false
        }
    }
}
</script>
