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
                title: () => null,
                label: context => {
                    const split = context.label
                    const runCount = context.raw

                    const avgKey = `avg${split}`
                    const avgMs = props.player.averages[avgKey]
                    const avg = formatMsToMinSec(avgMs)

                    const fastestKey = `fastest${split}`
                    const fastestMs = props.player.fastests[fastestKey]
                    const fastest = formatMsToMinSec(fastestMs)

                    return [
                        `${split}: ${runCount}`,
                        `Average: ${avg}`,
                        `Fastest: ${fastest}`
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

function formatMsToMinSec(ms) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>
