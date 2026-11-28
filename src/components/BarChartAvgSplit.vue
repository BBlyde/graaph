<template>
    <div class="relative h-80 sm:h-96">
        <Bar :data="chartData" :options="chartOptions" />
        <div
            v-if="tooltip.visible"
            class="pointer-events-none absolute z-10 border border-white/15 bg-[#101011] px-3 py-2 text-xs text-white shadow-lg"
            :style="{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: `translate(-50%, ${tooltip.placeBelow ? '0' : '-100%'})`
            }"
            role="tooltip"
        >
            <div v-for="(line, index) in tooltip.lines" :key="index" class="mb-2 whitespace-nowrap last:mb-0">
                <div>{{ line.label }}: <span class="text-[#27AE60]">{{ line.counter || 'No data' }}</span> runs ({{ formatRank(line.lbCounter) }})</div>
                <div>Average: <span class="text-[#27AE60]">{{ line.time || 'No data' }}</span> ({{ formatRank(line.lbAvg) }})</div>
                <div>Fastest: <span class="text-[#27AE60]">{{ line.fastest || 'No data' }}</span> ({{ formatRank(line.lbFastest) }})</div>
                <div v-if="line.conversion">Conversion: <span class="text-[#27AE60]">{{ formatConversion(line.conversion.rate) }}</span> ({{ formatRank(line.conversion.rank) }})</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
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
    const top = center.y - element.height / 2
    const bottom = center.y + element.height / 2
    const estimatedHeight = 18 + items.length * 56
    const placeBelow = this.chart.chartArea.bottom - bottom >= estimatedHeight

    return {
        x: center.x,
        y: placeBelow ? bottom : top,
        xAlign: 'center',
        yAlign: placeBelow ? 'top' : 'bottom'
    }
}

const props = defineProps({
    splitData: {
        type: Object,
        required: true
    },
    segmentStats: {
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

function formatRank(rank) {
    return rank == null ? '—' : `#${rank}`
}

function formatConversion(rate) {
    return Number.isFinite(rate) ? `${rate.toFixed(1)}%` : '—'
}

const tooltip = ref({ visible: false, x: 0, y: 0, placeBelow: false, lines: [] })
const segmentKeys = ['overworld', 'nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra']
const periodKeys = ['avg1d', 'avg7d', 'avg30d', 'avgAT']

function renderTooltip({ chart, tooltip: chartTooltip }) {
    const dataPoints = chartTooltip.dataPoints
    if (!chartTooltip.opacity || !dataPoints?.length) {
        tooltip.value = { ...tooltip.value, visible: false }
        return
    }

    const element = dataPoints[0].element
    const center = element.getCenterPoint()
    const top = center.y - element.height / 2
    const bottom = center.y + element.height / 2
    const estimatedHeight = 18 + dataPoints.length * 56
    const placeBelow = chart.chartArea.bottom - bottom >= estimatedHeight

    tooltip.value = {
        visible: true,
        x: center.x,
        y: placeBelow ? bottom : top,
        placeBelow,
        lines: dataPoints.map(dataPoint => {
            const segment = segmentKeys[dataPoint.datasetIndex]
            const period = periodKeys[dataPoint.dataIndex]
            const segmentIndex = segmentKeys.indexOf(segment)
            const stats = props.segmentStats[segment]?.[period] ?? {}
            const previousSegmentStats = segmentIndex > 0
                ? props.segmentStats[segmentKeys[segmentIndex - 1]]?.[period]
                : null

            return {
                label: dataPoint.dataset.label,
                time: formatMsToMinSec(dataPoint.raw),
                counter: stats.counter,
                conversion: segmentIndex > 0 ? {
                    rate: previousSegmentStats?.counter > 0
                        ? stats.counter / previousSegmentStats.counter * 100
                        : undefined,
                    rank: stats.lbConversion
                } : null,
                fastest: formatMsToMinSec(stats.fastest),
                lbCounter: stats.lbCounter,
                lbFastest: stats.lbFastest,
                lbAvg: stats.lbAvg
            }
        })
    }
}

const splitData = props.splitData
const chartData = {
    labels: ['24 hours', '7 Days', '30 Days', 'All Time'],
    datasets: [
        {
            label: 'Overworld',
            data: [splitData.overworld.avg1d, splitData.overworld.avg7d, splitData.overworld.avg30d, splitData.overworld.avgAT],
            backgroundColor: '#C9922A',
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
            backgroundColor: '#A5AB7D',
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

const maxStackedTime = Math.max(
    0,
    ...chartData.labels.map((_, index) =>
        chartData.datasets.reduce((total, dataset) => {
            const value = dataset.data[index]
            return total + (Number.isFinite(value) ? value : 0)
        }, 0)
    )
)
const maxMinutes = maxStackedTime / 60000
const targetMinuteStep = maxMinutes / 4
const minuteTickStep = (() => {
    if (targetMinuteStep <= 1) return 60000

    const magnitude = 10 ** Math.floor(Math.log10(targetMinuteStep))
    const normalizedStep = targetMinuteStep / magnitude
    const niceStep = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
    return niceStep * magnitude * 60000
})()

const chartOptions = {
    indexAxis: 'y',
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
        },
        tooltip: {
            enabled: false,
            external: renderTooltip,
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
                stepSize: minuteTickStep,
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