<template>
    <div class="h-80 sm:h-96">
        <Bar :data="chartData" :options="chartOptions" />
    </div>
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

Tooltip.positioners.segmentCenter = function (items) {
    const activeItem = items[0]
    const element = activeItem?.element
    if (!element) return false

    const center = element.getCenterPoint()
    const isFirstRow = activeItem.index === 0
    const y = isFirstRow
        ? center.y + element.height / 2
        : center.y - element.height / 2

    return {
        x: center.x,
        y,
        yAlign: isFirstRow ? 'top' : 'bottom'
    }
}

const props = defineProps({
    splitData: {
        type: Object,
        required: true
    }
})

function formatMsToMinSec(ms) {
    if (!Number.isFinite(ms)) return ''
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
            borderWidth: 0,
        },
        {
            label: 'Nether',
            data: [splitData.nether.avg1d, splitData.nether.avg7d, splitData.nether.avg30d, splitData.nether.avgAT],
            backgroundColor: '#512020',
            borderWidth: 0,
        },
        {
            label: 'Bastion',
            data: [splitData.bastion.avg1d, splitData.bastion.avg7d, splitData.bastion.avg30d, splitData.bastion.avgAT],
            backgroundColor: '#2d2b36',
            borderWidth: 0,
        },
        {
            label: 'Fortress',
            data: [splitData.fortress.avg1d, splitData.fortress.avg7d, splitData.fortress.avg30d, splitData.fortress.avgAT],
            backgroundColor: '#37181d',
            borderWidth: 0,
        },
        {
            label: 'Stronghold',
            data: [splitData.stronghold.avg1d, splitData.stronghold.avg7d, splitData.stronghold.avg30d, splitData.stronghold.avgAT],
            backgroundColor: '#686b68',
            borderWidth: 0,
        },
        {
            label: 'End',
            data: [splitData.end.avg1d, splitData.end.avg7d, splitData.end.avg30d, splitData.end.avgAT],
            backgroundColor: '#b0b682',
            borderWidth: 0,
        },
        {
            label: 'Outer End',
            data: [splitData.elytra.avg1d, splitData.elytra.avg7d, splitData.elytra.avg30d, splitData.elytra.avgAT],
            backgroundColor: '#a170a0',
            borderWidth: 0,
        }
    ],
}

const chartOptions = {
    indexAxis: 'y',
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
        title: {
            display: false
        },
        datalabels: {
            color: '#fff',
            anchor: 'center',
            align: 'center',
            clamp: true,
            display: context => {
                const value = context.dataset.data[context.dataIndex]
                return Number.isFinite(value) && value > 0
            },
            formatter: (value) => {
                return formatMsToMinSec(value);
            },
            font: {
                weight: 'bold',
                family: 'Outfit, sans-serif',
                size: 12
            },
            textStrokeColor: 'rgba(16, 16, 17, 0.8)',
            textStrokeWidth: 2,
        },
        tooltip: {
            position: 'segmentCenter',
            xAlign: 'center',
            yAlign: 'bottom',
            caretAlign: 'center',
            backgroundColor: '#101011',
            borderColor: 'rgba(255, 255, 255, 0.14)',
            borderWidth: 1,
            padding: 12,
            titleColor: '#ffffff',
            bodyColor: '#d4d4d8',
            titleFont: { family: 'Outfit, sans-serif', weight: '600' },
            bodyFont: { family: 'Outfit, sans-serif' },
            callbacks: {
                title: items => items[0]?.label ?? '',
                label: context => {
                    const time = formatMsToMinSec(context.raw)
                    return time ? `${context.dataset.label}: ${time}` : `${context.dataset.label}: no data`
                },
            }
        }
    },
    scales: {
        x: {
            stacked: true,
            ticks: {
                color: '#71717a',
                maxTicksLimit: 5,
                font: { family: 'Outfit, sans-serif', size: 12 },
                callback: value => formatMsToMinSec(value)
            },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            border: { display: false }
        },
        y: {
            stacked: true,
            ticks: { color: '#a1a1aa', font: { family: 'Outfit, sans-serif', size: 13 } },
            grid: { display: false },
            border: { display: false }
        },
    },
}
</script>