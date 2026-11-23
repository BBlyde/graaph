<template>
    <div class="relative h-64 sm:h-72">
        <Bar :data="chartData" :options="chartOptions" />
        <PlayerStatsTooltip
            v-if="tooltip.visible"
            :split-name="tooltip.splitName"
            :split="tooltip.split"
            :x="tooltip.x"
            :y="tooltip.y"
            :align-right="tooltip.alignRight"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import PlayerStatsTooltip from '@/components/PlayerStatsTooltip.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels)

Tooltip.positioners.barTopAware = function (items) {
    const activeItem = items[0]
    const element = activeItem?.element
    if (!element) return false

    const point = element.tooltipPosition()
    // Keep the multi-line tooltip above the bar unless there is not enough plot area.
    const hasRoomAbove = point.y - this.chart.chartArea.top >= 90
    const isLastBar = activeItem.index === this.chart.data.labels.length - 1
    return {
        ...point,
        xAlign: isLastBar ? 'right' : undefined,
        yAlign: isLastBar ? 'bottom' : hasRoomAbove ? 'bottom' : 'top'
    }
}

const props = defineProps({
    advancedData: {
        type: Object,
        required: true
    }
})

const tooltip = ref({ visible: false, x: 0, y: 0, splitName: '', split: null })

function renderTooltip({ chart, tooltip: chartTooltip }) {
    const dataPoint = chartTooltip.dataPoints?.[0]
    if (!chartTooltip.opacity || !dataPoint) {
        tooltip.value = { ...tooltip.value, visible: false }
        return
    }

    const alignRight = dataPoint.dataIndex === chart.data.labels.length - 1
    tooltip.value = {
        visible: true,
        x: alignRight ? chartTooltip.caretX : chartTooltip.x,
        y: chartTooltip.y,
        alignRight,
        splitName: dataPoint.label,
        split: props.advancedData.data[dataPoint.label.toLowerCase()]
    }
}

const splitData = props.advancedData.data
const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const chartData = {
    labels: splits,
    datasets: [
        {
            data: [splitData.nether.counter, splitData.bastion.counter, splitData.fortress.counter, splitData.stronghold.counter, splitData.end.counter, splitData.elytra.counter, splitData.credits.counter],
            backgroundColor: ['#512020', '#2d2b36', '#37181d', '#686b68', '#A5AB7D', '#a170a0', '#030b13'],
            borderWidth: 0,
            barPercentage: 0.62,
            categoryPercentage: 0.72
        },
    ]
}

const chartOptions = {
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
            enabled: false,
            external: renderTooltip,
            mode: 'index',
            position: 'barTopAware',
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