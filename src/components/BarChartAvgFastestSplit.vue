<template>
    <div>
        <div class="relative h-64 sm:h-72">
            <Line :data="chartData" :options="chartOptions" />
            <PlayerStatsTooltip
                v-if="tooltip.visible"
                :split-name="tooltip.splitName"
                :split="tooltip.split"
                :x="tooltip.x"
                :y="tooltip.y"
                :align-right="tooltip.alignRight"
                :anchor-to-point="true"
                :center-vertically="true"
            />
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineController, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import PlayerStatsTooltip from '@/components/PlayerStatsTooltip.vue'

ChartJS.register(Title, Tooltip, Legend, LineController, LineElement, PointElement, CategoryScale, LinearScale, ChartDataLabels)

Tooltip.positioners.playerStatsLine = function (items) {
    const activeItem = items[0]
    const element = activeItem?.element
    if (!element) return false

    const point = element.tooltipPosition()
    const isLastBar = activeItem.index === this.chart.data.labels.length - 1
    return isLastBar ? { ...point, xAlign: 'right', yAlign: 'bottom' } : point
}

const props = defineProps({
    advancedData: {
        type: Object,
        required: true
    },
    selectedMetric: {
        type: String,
        required: true
    }
})

const selectedMetricLabel = computed(() => props.selectedMetric === 'fastest' ? 'Fastest' : 'Average')
const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const splitColors = ['#512020', '#2d2b36', '#37181d', '#686b68', '#A5AB7D', '#a170a0', '#030b13']
const splitKeys = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
const chartData = computed(() => ({
    labels: splits,
    datasets: [
        {
            label: selectedMetricLabel.value,
            data: splitKeys.map(split => props.advancedData.data[split][props.selectedMetric]),
            borderColor: '#f4f4f5',
            backgroundColor: splitColors,
            pointBackgroundColor: splitColors,
            pointBorderColor: '#151517',
            pointRadius: 5,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.2
        }
    ]
}))

const minuteTickStep = computed(() => {
    const values = chartData.value.datasets[0].data.filter(Number.isFinite)
    const maxMinutes = Math.max(0, ...values) / 60000
    const targetStep = maxMinutes / 4
    if (targetStep <= 1) return 60000

    const magnitude = 10 ** Math.floor(Math.log10(targetStep))
    const normalizedStep = targetStep / magnitude
    const niceStep = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
    return niceStep * magnitude * 60000
})

const tooltip = ref({ visible: false, x: 0, y: 0, splitName: '', split: null })

function formatMsToMinSec(ms) {
    if (!Number.isFinite(ms)) return ''
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function renderTooltip({ chart, tooltip: chartTooltip }) {
    const dataPoint = chartTooltip.dataPoints?.[0]
    if (!chartTooltip.opacity || !dataPoint) {
        tooltip.value = { ...tooltip.value, visible: false }
        return
    }

    const { x, y } = dataPoint.element.tooltipPosition()
    const placeOnLeft = dataPoint.dataIndex === chart.data.labels.length - 1
    tooltip.value = {
        visible: true,
        x: x + (placeOnLeft ? -8 : 8),
        y,
        alignRight: placeOnLeft,
        splitName: dataPoint.label,
        split: props.advancedData.data[dataPoint.label.toLowerCase()]
    }
}

const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 1500,
        easing: 'easeOutQuart',
        delay: context => context.type === 'data'
            ? context.dataIndex * 110 + context.datasetIndex * 70
            : 0
    },
    font: { family: 'Outfit, sans-serif' },
    layout: {
        padding: { top: 20 }
    },
    plugins: {
        legend: {
            display: false
        },
        title: {
            display: false
        },
        datalabels: {
            color: '#fff',
            anchor: 'end',
            align: 'top',
            clamp: true,
            display: context => Number.isFinite(context.dataset.data[context.dataIndex]) && context.dataset.data[context.dataIndex] > 0,
            formatter: formatMsToMinSec,
            font: {
                weight: 'bold',
                family: 'Outfit, sans-serif',
                size: 12
            },
        },
        tooltip: {
            enabled: false,
            external: renderTooltip,
            mode: 'index',
            position: 'playerStatsLine',
            displayColors: false,
            caretAlign: 'center',
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
            ticks: {
                color: '#71717a',
                maxTicksLimit: 5,
                stepSize: minuteTickStep.value,
                font: { family: 'Outfit, sans-serif', size: 12 },
                callback: value => formatMsToMinSec(value)
            },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            border: { display: false }
        }
    }
}))
</script>
