<template>
    <Line :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, TimeScale, LinearScale, PointElement } from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-date-fns'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, TimeScale, LinearScale, PointElement)

const props = defineProps({
    advancedData: {
        type: Object,
        required: true
    }
})

const formatTime = ms => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const splitData = props.advancedData.data
const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const dataAvg = [
    { x: 'Nether', y: splitData.nether.avg },
    { x: 'Bastion', y: splitData.bastion.avg },
    { x: 'Fortress', y: splitData.fortress.avg },
    { x: 'Stronghold', y: splitData.stronghold.avg },
    { x: 'End', y: splitData.end.avg },
    { x: 'Elytra', y: splitData.elytra.avg },
    { x: 'Credits', y: splitData.credits.avg },
]
const dataFastest = [
    { x: 'Nether', y: splitData.nether.fastest },
    { x: 'Bastion', y: splitData.bastion.fastest },
    { x: 'Fortress', y: splitData.fortress.fastest },
    { x: 'Stronghold', y: splitData.stronghold.fastest },
    { x: 'End', y: splitData.end.fastest },
    { x: 'Elytra', y: splitData.elytra.fastest },
    { x: 'Credits', y: splitData.credits.fastest },
]

const chartData = {
    datasets: [
        {
            label: 'Average',
            data: dataAvg,
            borderColor: '#002174',
            backgroundColor: '#002174',
            tension: 0,
            pointRadius: 3,
            borderWidth: 1.5,
            fill: false,
            pointBackgroundColor: ['#512020', '#2d2b36', '#37181d', '#686b68', '#b0b682', '#a170a0', '#366a5e']
        },
        {
            label: 'Fastest',
            data: dataFastest,
            borderColor: '#69009e',
            backgroundColor: '#69009e',
            tension: 0,
            pointRadius: 3,
            borderWidth: 1.5,
            fill: false,
            pointBackgroundColor: ['#512020', '#2d2b36', '#37181d', '#686b68', '#b0b682', '#a170a0', '#366a5e']
        }
    ]
}

const chartOptions = {
    responsive: true,
    plugins: {
        legend: { position: 'bottom' },
        title: {
            display: true,
            text: 'Average/Fastest Time By Split'
        },
        datalabels: {
            align: 'top',
            anchor: 'end',
            formatter: value => formatTime(value.y),
            font: { weight: 'bold' },
            color: '#fff'
        },
        tooltip: {
            enabled: false
        }
    },
    scales: {
        x: {
            type: 'category',
            labels: splits,
        },
        y: {
            type: 'time',
            time: {
                unit: 'minute',
                displayFormats: { minute: 'm:ss' },
            },
            min: 0,
            ticks: {
                display: false
            },
            grid: {
                display: false
            }
        },
    },
}
</script>