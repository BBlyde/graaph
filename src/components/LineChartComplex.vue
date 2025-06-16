<template>
    <div>
        <Line :data="chartData" :options="chartOptions" :height="400" :width="400"/>
    </div>
</template>

<script setup>
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, TimeScale, LinearScale, PointElement } from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-date-fns'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, TimeScale, LinearScale, PointElement)

const props = defineProps({
    deltaData: {
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

const splitData = props.deltaData
const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const data1D = [
    { x: 'Nether', y: splitData.nether.avg1d },
    { x: 'Bastion', y: splitData.bastion.avg1d },
    { x: 'Fortress', y: splitData.fortress.avg1d },
    { x: 'Stronghold', y: splitData.stronghold.avg1d },
    { x: 'End', y: splitData.end.avg1d },
    { x: 'Elytra', y: splitData.elytra.avg1d },
    { x: 'Credits', y: splitData.credits.avg1d },
]
const data7D = [
    { x: 'Nether', y: splitData.nether.avg7d },
    { x: 'Bastion', y: splitData.bastion.avg7d },
    { x: 'Fortress', y: splitData.fortress.avg7d },
    { x: 'Stronghold', y: splitData.stronghold.avg7d },
    { x: 'End', y: splitData.end.avg7d },
    { x: 'Elytra', y: splitData.elytra.avg7d },
    { x: 'Credits', y: splitData.credits.avg7d },
]

const data30D = [
    { x: 'Nether', y: splitData.nether.avg30d },
    { x: 'Bastion', y: splitData.bastion.avg30d },
    { x: 'Fortress', y: splitData.fortress.avg30d },
    { x: 'Stronghold', y: splitData.stronghold.avg30d },
    { x: 'End', y: splitData.end.avg30d },
    { x: 'Elytra', y: splitData.elytra.avg30d },
    { x: 'Credits', y: splitData.credits.avg30d },
]

const dataAT = [
    { x: 'Nether', y: splitData.nether.avgAT },
    { x: 'Bastion', y: splitData.bastion.avgAT },
    { x: 'Fortress', y: splitData.fortress.avgAT },
    { x: 'Stronghold', y: splitData.stronghold.avgAT },
    { x: 'End', y: splitData.end.avgAT },
    { x: 'Elytra', y: splitData.elytra.avgAT },
    { x: 'Credits', y: splitData.credits.avgAT },
]

const chartData = {
    datasets: [
        {
            label: 'Average 1 Day',
            data: data1D,
            borderColor: '#002174',
            backgroundColor: '#002174',
            tension: 0.3,
            pointRadius: 3,
            borderWidth: 1.5,
            fill: false,
            pointBackgroundColor: ['#512020','#2d2b36','#37181d','#686b68','#b0b682','#a170a0','#366a5e']
        },
        {
            label: 'Average 7 Days',
            data: data7D,
            borderColor: '#69009e',
            backgroundColor: '#69009e',
            tension: 0.3,
            pointRadius: 3,
            borderWidth: 1.5,
            fill: false,
            pointBackgroundColor: ['#512020','#2d2b36','#37181d','#686b68','#b0b682','#a170a0','#366a5e']
        },
        {
            label: 'Average 30 Days',
            data: data30D,
            borderColor: '#009e0c',
            backgroundColor: '#009e0c',
            tension: 0.3,
            pointRadius: 3,
            borderWidth: 1.5,
            fill: false,
            pointBackgroundColor: ['#512020','#2d2b36','#37181d','#686b68','#b0b682','#a170a0','#366a5e']
        },
        {
            label: 'Average All Time',
            data: dataAT,
            borderColor: '#9e0000',
            backgroundColor: '#9e0000',
            tension: 0.3,
            pointRadius: 3,
            borderWidth: 1.5,
            fill: false,
            pointBackgroundColor: ['#512020','#2d2b36','#37181d','#686b68','#b0b682','#a170a0','#366a5e']
        }
    ]
}

const chartOptions = {
    responsive: true,
    plugins: {
        legend: { position: 'bottom' },
        title: {
            display: true,
            text: 'COMPLEX Delta from Fastest Split Time By Period of Time'
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
                stepSize: 10,
                display: false
            },
            grid: {
                display: false
            }
        },
    },

}
</script>