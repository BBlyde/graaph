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
            :align-center="tooltip.alignCenter"
            :anchor-to-point="true"
            :place-below="tooltip.placeBelow"
        />
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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

const tooltip = ref({
    visible: false,
    x: 0,
    y: 0,
    splitName: '',
    split: null,
    alignRight: false,
    alignCenter: false,
    placeBelow: false
})

function renderTooltip({ chart, tooltip: chartTooltip }) {
    const dataPoint = chartTooltip.dataPoints?.[0]
    if (!chartTooltip.opacity || !dataPoint) {
        tooltip.value = { ...tooltip.value, visible: false }
        return
    }

    const { x, y } = dataPoint.element.tooltipPosition()
    const isFirstBar = dataPoint.dataIndex === 0
    const isLastBar = dataPoint.dataIndex === chart.data.labels.length - 1
    const hasRoomAbove = y - chart.chartArea.top >= 90
    tooltip.value = {
        visible: true,
        x,
        y,
        alignRight: isLastBar,
        alignCenter: !isFirstBar && !isLastBar,
        placeBelow: !hasRoomAbove,
        splitName: dataPoint.label,
        split: props.advancedData.data[dataPoint.label.toLowerCase()]
    }
}

const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const splitKeys = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
const chartData = computed(() => ({
    labels: splits,
    datasets: [
        {
            data: splitKeys.map(split => props.advancedData.data[split].counter),
            backgroundColor: ['#512020', '#2d2b36', '#37181d', '#686b68', '#A5AB7D', '#a170a0', '#030b13'],
            borderWidth: 0,
            barThickness: 32
        },
    ]
}))

const hasData = computed(() => chartData.value.datasets[0].data.some(value => Number.isFinite(value) && value > 0))

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 800,
        easing: 'easeOutQuart',
        delay: context => context.type === 'data'
            ? context.dataIndex * 30
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
            clip: false,
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
            ticks: {
                color: '#71717a',
                precision: 0,
                font: { family: 'Outfit, sans-serif', size: 13 },
                callback: value => !hasData.value && value > 0 ? '' : value
            },
            afterFit: scale => {
                scale.width = Math.max(scale.width, 48)
            },
            grid: {
                color: context => !hasData.value && context.tick.value > 0
                    ? 'transparent'
                    : 'rgba(255, 255, 255, 0.06)'
            },
            border: { display: false }
        }
    }
}
</script>