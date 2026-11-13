<template>
    <div class="h-64 sm:h-72">
        <Bar :data="chartData" :options="chartOptions" />
    </div>
</template>

<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels)

Tooltip.positioners.barTopAware = function (items) {
    const element = items[0]?.element
    if (!element) return false

    const point = element.tooltipPosition()
    // Keep the multi-line tooltip above the bar unless there is not enough plot area.
    const hasRoomAbove = point.y - this.chart.chartArea.top >= 90
    return { ...point, yAlign: hasRoomAbove ? 'bottom' : 'top' }
}

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
            backgroundColor: ['#512020', '#2d2b36', '#37181d', '#686b68', '#b0b682', '#a170a0', '#030b13'],
            borderWidth: 0,
            barPercentage: 0.62,
            categoryPercentage: 0.72
        },
    ]
}

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    font: { family: 'Outfit, sans-serif' },
    plugins: {
        legend: {
            display: false
        },
        title: {
            display: false
        },
        datalabels: {
            color: '#fff',
            anchor: 'center',
            align: 'center',
            display: context => Number.isFinite(context.dataset.data[context.dataIndex]) && context.dataset.data[context.dataIndex] > 0,
            font: {
                weight: 'bold',
                family: 'Outfit, sans-serif',
                size: 12
            },
        },
        tooltip: {
            mode: 'index',
            position: 'barTopAware',
            displayColors: false,
            xAlign: 'center',
            caretAlign: 'center',
            backgroundColor: '#101011',
            borderColor: 'rgba(255, 255, 255, 0.14)',
            borderWidth: 1,
            padding: 12,
            titleColor: '#ffffff',
            bodyColor: '#d4d4d8',
            titleFont: { family: 'Outfit, sans-serif', weight: '600', size: 14 },
            bodyFont: { family: 'Outfit, sans-serif', size: 12 },
            callbacks: {
                title: () => null,
                label: context => {
                    const splitName = context.label
                    const splitKey = `${splitName}`.toLowerCase()
                    const split = props.advancedData.data[splitKey]

                    const runCount = context.raw
                    const formatRank = rank => rank == null ? '—' : `#${rank}`

                    const avgMs = split.avg
                    const avg = formatMsToMinSec(avgMs)
                    const avgLb = split.lbAvg

                    const fastestMs = split.fastest
                    const fastest = formatMsToMinSec(fastestMs)
                    const fastestLb = split.lbFastest

                    return [
                        `${splitName}: ${runCount} runs (${formatRank(split.lbCounter)})`,
                        `Fastest: ${fastest} (${formatRank(fastestLb)})`,
                        `Average: ${avg} (${formatRank(avgLb)})`,
                    ]
                }
            }
        }
    },
    scales: {
        x: {
            ticks: { color: '#a1a1aa', font: { family: 'Outfit, sans-serif', size: 12 } },
            grid: { display: false },
            border: { display: false }
        },
        y: {
            beginAtZero: true,
            ticks: { color: '#71717a', precision: 0, font: { family: 'Outfit, sans-serif', size: 13 } },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            border: { display: false }
        }
    }
}
</script>