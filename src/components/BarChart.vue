<template>
    <Bar :data="chartData" :options="chartOptions"/>
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

const splitData = props.player.data
const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const chartData = {
    labels: splits,
    datasets: [
        {
            data: [splitData.nether.counter, splitData.bastion.counter, splitData.fortress.counter, splitData.stronghold.counter, splitData.end.counter, splitData.elytra.counter, splitData.credits.counter],
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
                    const splitName = context.label
                    const splitKey = `${splitName}`.toLowerCase()

                    const runCount = context.raw
                    const lbCount = props.player.data[splitKey].lbCounter

                    const avgMs = props.player.data[splitKey].avg
                    const avg = formatMsToMinSec(avgMs)
                    const avgLb = props.player.data[splitKey].lbAvg

                    const fastestMs = props.player.data[splitKey].fastest
                    const fastest = formatMsToMinSec(fastestMs)
                    const fastestLb = props.player.data[splitKey].lbFastest

                    return [
                        `${splitName}: ${runCount} (#${lbCount})`,
                        `Fastest: ${fastest} (#${fastestLb})`,
                        `Average: ${avg} (#${avgLb})`,
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
