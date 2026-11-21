<template>
    <div class="relative mx-auto h-80 w-full max-w-3xl sm:h-96">
        <Radar :data="chartData" :options="chartOptions" />
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
    Chart as ChartJS,
    Filler,
    Legend,
    LineElement,
    PointElement,
    RadialLinearScale,
    RadarController,
    Tooltip
} from 'chart.js'

ChartJS.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Legend, Tooltip)

const props = defineProps({
    splitData: {
        type: Object,
        required: true
    },
    segmentStats: {
        type: Object,
        required: true
    },
    selectedDays: {
        type: Number,
        required: true
    }
})

const splits = [
    { label: 'Overworld', key: 'overworld' },
    { label: 'Nether', key: 'nether' },
    { label: 'Bastion', key: 'bastion' },
    { label: 'Fortress', key: 'fortress' },
    { label: 'Stronghold', key: 'stronghold' },
    { label: 'End', key: 'end' },
    { label: 'Outer End', key: 'elytra' }
]
const periodKeys = { 1: 'avg1d', 7: 'avg7d', 30: 'avg30d', 9999: 'avgAT' }

const chartData = computed(() => {
    const periodKey = periodKeys[props.selectedDays]
    return {
        labels: splits.map(split => split.label),
        datasets: [
        {
            label: 'Average',
            data: splits.map(({ key }) => {
                const value = props.splitData[key]?.[periodKey]
                return Number.isFinite(value) ? value : null
            }),
            borderColor: '#f4f4f5',
            backgroundColor: 'rgba(244, 244, 245, 0.14)',
            pointBackgroundColor: '#f4f4f5',
            pointBorderColor: '#151517',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#f4f4f5',
            borderWidth: 2
        },
        {
            label: 'Fastest',
            data: splits.map(({ key }) => {
                const value = props.segmentStats[key]?.[periodKey]?.fastest
                return Number.isFinite(value) ? value : null
            }),
            borderColor: '#27AE60',
            backgroundColor: 'rgba(39, 174, 96, 0.14)',
            pointBackgroundColor: '#27AE60',
            pointBorderColor: '#151517',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#27AE60',
            borderWidth: 2
        }
        ]
    }
})

function formatMsToMinSec(ms) {
    if (!Number.isFinite(ms)) return ''
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    font: { family: 'Outfit, sans-serif' },
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                color: '#a1a1aa',
                padding: 14,
                boxWidth: 10,
                boxHeight: 10,
                font: { family: 'Outfit, sans-serif', size: 12 }
            }
        },
        datalabels: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: context => {
                    const time = formatMsToMinSec(context.raw)
                    return `${context.dataset.label}: ${time || 'No data'}`
                }
            }
        }
    },
    scales: {
        r: {
            beginAtZero: true,
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: {
                color: '#a1a1aa',
                font: { family: 'Outfit, sans-serif', size: 12 }
            },
            ticks: {
                color: '#71717a',
                maxTicksLimit: 5,
                backdropColor: 'transparent',
                font: { family: 'Outfit, sans-serif', size: 10 },
                callback: value => formatMsToMinSec(value)
            }
        }
    }
}
</script>
