<template>
    <div>
        <div class="relative h-80 sm:h-96">
            <Bar :data="chartData" :options="chartOptions" />
            <div v-if="tooltip" ref="tooltipElement"
                class="pointer-events-none absolute z-10 w-max whitespace-nowrap rounded border border-white/15 bg-[#101011] px-3 pb-1 pt-0.5 text-right text-xs text-white shadow-lg"
                :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px`, visibility: tooltip.positioned ? 'visible' : 'hidden' }"
                role="tooltip">
                <div>{{ tooltip.row.label }}: <span class="text-primarry">{{ tooltip.row.count }}</span></div>
                <div>Fastest: <span class="text-primarry">{{ formatMsToMinSec(tooltip.row.min) }}</span></div>
                <div>25%: <span class="text-primarry">{{ formatMsToMinSec(tooltip.row.q1) }}</span></div>
                <div>Median: <span class="text-primarry">{{ formatMsToMinSec(tooltip.row.median) }}</span></div>
                <div>75%: <span class="text-primarry">{{ formatMsToMinSec(tooltip.row.q3) }}</span></div>
                <div>Slowest: <span class="text-primarry">{{ formatMsToMinSec(tooltip.row.max) }}</span></div>
            </div>
        </div>
        <p class="mt-3 text-center text-xs text-zinc-500">
            Fastest to slowest, middle box represents 50% of runs
        </p>
    </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({
    segmentTimes: {
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

function formatMsToMinSec(ms) {
    if (!Number.isFinite(ms)) return ''
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function quantile(sorted, ratio) {
    const position = (sorted.length - 1) * ratio
    const lower = Math.floor(position)
    const upper = Math.ceil(position)
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

const rows = computed(() => {
    const periodKey = periodKeys[props.selectedDays]
    return splits.map(({ label, key }) => {
        const sorted = [...(props.segmentTimes[key]?.[periodKey] ?? [])].sort((a, b) => a - b)
        if (!sorted.length) return { label, count: 0 }
        return {
            label,
            count: sorted.length,
            min: sorted[0],
            q1: quantile(sorted, 0.25),
            median: quantile(sorted, 0.5),
            q3: quantile(sorted, 0.75),
            max: sorted[sorted.length - 1]
        }
    })
})

const rowsWithDistribution = computed(() => rows.value.filter(row => row.count > 1))

const chartData = computed(() => {
    const maxTime = Math.max(0, ...rowsWithDistribution.value.map(row => row.max))
    const medianHalfWidth = maxTime * 0.004
    const pick = build => rows.value.map(row => row.count > 1 ? build(row) : null)

    return {
        labels: rows.value.map(row => row.label),
        datasets: [
            {
                label: 'Median',
                data: pick(row => [row.median - medianHalfWidth, row.median + medianHalfWidth]),
                backgroundColor: '#ffffff',
                barThickness: 26,
                grouped: false,
                order: 0
            },
            {
                label: 'Middle 50%',
                data: pick(row => [row.q1, row.q3]),
                backgroundColor: 'rgba(39, 174, 96, 0.75)',
                borderColor: '#27AE60',
                borderWidth: 1,
                barThickness: 22,
                grouped: false,
                order: 1
            },
            {
                label: 'Range',
                data: pick(row => [row.min, row.max]),
                backgroundColor: '#71717a',
                barThickness: 3,
                grouped: false,
                order: 2
            }
        ]
    }
})

const minuteTickStep = computed(() => {
    const maxMinutes = Math.max(0, ...rowsWithDistribution.value.map(row => row.max)) / 60000
    const targetStep = maxMinutes / 5
    if (targetStep <= 1) return 60000

    const magnitude = 10 ** Math.floor(Math.log10(targetStep))
    const normalizedStep = targetStep / magnitude
    const niceStep = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
    return niceStep * magnitude * 60000
})

const tooltip = ref(null)
const tooltipElement = ref(null)
let tooltipUpdate = 0

async function renderTooltip({ chart, tooltip: chartTooltip }) {
    const update = ++tooltipUpdate
    const dataPoint = chartTooltip.dataPoints?.[0]
    if (!chartTooltip.opacity || !dataPoint) {
        tooltip.value = null
        return
    }

    const point = chart.getDatasetMeta(0).data[dataPoint.dataIndex].getCenterPoint()
    tooltip.value = { row: rows.value[dataPoint.dataIndex], left: 0, top: 0, positioned: false }
    await nextTick()
    if (update !== tooltipUpdate || !tooltipElement.value) return

    const { width, height } = tooltipElement.value.getBoundingClientRect()
    const gap = 7
    tooltip.value = {
        ...tooltip.value,
        left: Math.max(0, Math.min(point.x - width / 2, chart.width - width)),
        top: Math.max(0, Math.min(
            point.y >= height + gap ? point.y - height - gap : point.y + gap,
            chart.height - height
        )),
        positioned: true
    }
}

const chartOptions = computed(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    font: { family: 'Outfit, sans-serif' },
    interaction: { mode: 'nearest', axis: 'xy', intersect: true },
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
            enabled: false,
            external: renderTooltip,
            mode: 'nearest',
            intersect: true,
            filter: item => item.datasetIndex === 1 || item.datasetIndex === 2,
        }
    },
    scales: {
        x: {
            beginAtZero: true,
            ticks: {
                color: '#71717a',
                maxTicksLimit: 6,
                stepSize: minuteTickStep.value,
                font: { family: 'Outfit, sans-serif', size: 12 },
                callback: value => formatMsToMinSec(value)
            },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            border: { display: false }
        },
        y: {
            ticks: { color: '#a1a1aa', font: { family: 'Outfit, sans-serif', size: 13 } },
            grid: { display: false },
            border: { display: false }
        }
    }
}))
</script>
