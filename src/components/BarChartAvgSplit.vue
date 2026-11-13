<template>
    <Bar :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { Bar } from 'vue-chartjs'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
    splitData: {
        type: Object,
        required: true
    }
})

function formatMsToMinSec(ms) {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const splitData = props.splitData
const chartData = {
    labels: ['24 hours', '7 Days', '30 Days', 'All Time'],
    datasets: [
        {
            label: 'Overworld',
            data: [splitData.overworld.avg1d, splitData.overworld.avg7d, splitData.overworld.avg30d, splitData.overworld.avgAT],
            backgroundColor: '#145a32',
        },
        {
            label: 'Nether',
            data: [splitData.nether.avg1d, splitData.nether.avg7d, splitData.nether.avg30d, splitData.nether.avgAT],
            backgroundColor: '#512020',
        },
        {
            label: 'Bastion',
            data: [splitData.bastion.avg1d, splitData.bastion.avg7d, splitData.bastion.avg30d, splitData.bastion.avgAT],
            backgroundColor: '#2d2b36',
        },
        {
            label: 'Fortress',
            data: [splitData.fortress.avg1d, splitData.fortress.avg7d, splitData.fortress.avg30d, splitData.fortress.avgAT],
            backgroundColor: '#37181d',
        },
        {
            label: 'Stronghold',
            data: [splitData.stronghold.avg1d, splitData.stronghold.avg7d, splitData.stronghold.avg30d, splitData.stronghold.avgAT],
            backgroundColor: '#686b68',
        },
        {
            label: 'End',
            data: [splitData.end.avg1d, splitData.end.avg7d, splitData.end.avg30d, splitData.end.avgAT],
            backgroundColor: '#b0b682',
        },
        {
            label: 'Outer End',
            data: [splitData.elytra.avg1d, splitData.elytra.avg7d, splitData.elytra.avg30d, splitData.elytra.avgAT],
            backgroundColor: '#a170a0',
        }
    ],
}

const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
        legend: {
            position: 'bottom',
            labels: { color: '#a1a1aa' }
        },
        title: {
            display: false
        },
        datalabels: {
            color: '#fff',
            formatter: (value) => {
                if (isNaN(value)) {
                    return '';
                }
                return formatMsToMinSec(value);
            },
            font: {
                weight: 'bold',
            },
        },
        tooltip: {
            xAlign: 'right',
            yAlign: 'center',
            callbacks: {
                title: () => null,
                label: context => {
                    return context.dataset.label
                },
            }
        }
    },
    scales: {
        x: {
            stacked: true,
            display: false
        },
        y: {
            stacked: true,
            ticks: { color: '#a1a1aa' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
        },
    },
}
</script>