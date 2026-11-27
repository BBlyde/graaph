<template>
    <div class="relative h-64 sm:h-72">
        <Bar :data="chartData" :options="chartOptions" />
        <PlayerStatsTooltip
            v-if="tooltip.visible"
            :split-name="tooltip.splitName"
            :split="tooltip.split"
            :conversion="tooltip.conversion"
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
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import PlayerStatsTooltip from '@/components/PlayerStatsTooltip.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, ChartDataLabels)

Tooltip.positioners.barTopAware = function (items) {
    const activeItem = items.find(item =>
        this.chart.data.datasets[item.datasetIndex]?.label === 'Completion hitbox'
    ) ?? items[0]
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
    placeBelow: false,
    conversion: null
})

function renderTooltip({ chart, tooltip: chartTooltip }) {
    const dataPoint = chartTooltip.dataPoints?.find(item => item.dataset.label === 'Completion hitbox')
        ?? chartTooltip.dataPoints?.[0]
    if (!chartTooltip.opacity || !dataPoint) {
        tooltip.value = { ...tooltip.value, visible: false }
        return
    }

    const { x, y } = dataPoint.element.tooltipPosition()
    const isFirstBar = dataPoint.dataIndex === 0
    const isLastBar = dataPoint.dataIndex === chart.data.labels.length - 1
    const hasRoomAbove = y - chart.chartArea.top >= 90
    const isCompletion = dataPoint.label === 'Completions'
    const splitIndex = splitKeys.indexOf(dataPoint.label.toLowerCase())
    const splitStats = isCompletion ? props.advancedData.completionStats : props.advancedData.data[dataPoint.label.toLowerCase()]
    const previousSplitStats = isCompletion
        ? props.advancedData.data.credits
        : splitIndex > 0
            ? props.advancedData.data[splitKeys[splitIndex - 1]]
            : null
    tooltip.value = {
        visible: true,
        x,
        y,
        alignRight: isLastBar,
        alignCenter: !isFirstBar && !isLastBar,
        placeBelow: !hasRoomAbove,
        splitName: dataPoint.label,
        split: splitStats,
        conversion: isCompletion || splitIndex > 0 ? {
            rate: previousSplitStats?.counter > 0
                ? splitStats.counter / previousSplitStats.counter * 100
                : undefined,
            rank: splitStats.lbConversion
        } : null
    }
}

const splits = ['Nether', 'Bastion', 'Fortress', 'Stronghold', 'End', 'Elytra', 'Credits']
const splitKeys = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
const splitColors = ['#512020', '#2d2b36', '#37181d', '#686b68', '#A5AB7D', '#a170a0', '#030b13']
const hasCompletions = computed(() => Number.isFinite(props.advancedData.completionCount) && props.advancedData.completionCount > 0)
const chartData = computed(() => ({
    labels: hasCompletions.value ? [...splits, 'Completions'] : splits,
    datasets: [
        {
            data: [
                ...splitKeys.map(split => props.advancedData.data[split].counter),
                ...(hasCompletions.value ? [props.advancedData.completionCount] : [])
            ],
            backgroundColor: hasCompletions.value ? [...splitColors, '#27AE60'] : splitColors,
            borderWidth: 0,
            barThickness: 32
        },
        ...(hasCompletions.value ? [{
            type: 'line',
            label: 'Completion hitbox',
            data: [...splitKeys.map(() => null), props.advancedData.completionCount],
            showLine: false,
            pointRadius: 1,
            pointHoverRadius: 1,
            pointHitRadius: 24,
            pointBackgroundColor: 'rgba(0, 0, 0, 0)',
            pointBorderColor: 'rgba(0, 0, 0, 0)',
            borderWidth: 0,
            datalabels: { display: false }
        }] : [])
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