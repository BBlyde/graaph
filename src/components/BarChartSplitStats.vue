<template>
    <Bar :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels)

const props = defineProps({
    advancedData: {
        type: Object,
        required: true
    }
})

function formatMsToMinSec(ms) {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const splitData = props.advancedData.data
const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const chartData = {
    labels: splits,
    datasets: [
        {
            data: [splitData.nether.counter, splitData.bastion.counter, splitData.fortress.counter, splitData.stronghold.counter, splitData.end.counter, splitData.elytra.counter, splitData.credits.counter],
            backgroundColor: ['#512020', '#2d2b36', '#37181d', '#686b68', '#b0b682', '#a170a0', '#030b13']
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
            text: 'Advanced Statistics By Split'
        },
        datalabels: {
            color: '#fff',
            anchor: 'center',
            align: 'center',
            font: {
                weight: 'bold',
                size: 14
            },
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
                    const lbCount = props.advancedData.data[splitKey].lbCounter

                    const avgMs = props.advancedData.data[splitKey].avg
                    const avg = formatMsToMinSec(avgMs)
                    const avgLb = props.advancedData.data[splitKey].lbAvg

                    const fastestMs = props.advancedData.data[splitKey].fastest
                    const fastest = formatMsToMinSec(fastestMs)
                    const fastestLb = props.advancedData.data[splitKey].lbFastest

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
</script>