<template>
    <Bar :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Bar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels)

const props = defineProps({
    player: {
        type: Object,
        required: true
    }
})

const counters = props.player.counters
const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const chartData = {
    labels: splits,
    datasets: [
        {
            data: [counters.counterNether, counters.counterBastion, counters.counterFortress, counters.counterStronghold, counters.counterEnd, counters.counterElytra, counters.counterCredits],
            backgroundColor: ['#512020', '#2d2b36', '#37181d', '#686b68', '#b0b682', '#a170a0', '#366a5e']
        },
    ]
}

const chartOptions = {
    responsive: true,
    plugins: {
        legend: {
            display: false
        },
        title: {
            display: true,
            text: 'Run Counters'
        },
        datalabels: {
            color: '#fff',
            anchor: 'center',
            align: 'center',
            font: {
                weight: 'bold',
                size: 14
            },
            formatter: value => value
        },
        tooltip: {
            mode: 'index',
            displayColors: false,
            callbacks: {
                label: context => {
                    const split = context.label
                    const avgKey = `avg${split}`
                    const avg = props.player.averages[avgKey]
                    const minutes = Math.floor(avg / 60000)
                    const seconds = Math.floor((avg % 60000) / 1000)

                    return [
                        `Average: ${minutes}:${seconds.toString().padStart(2, '0')}`
                    ]
                }
            }
        }
    },
    scales: {
        y: {
            display: false
        }
    }
}
</script>
