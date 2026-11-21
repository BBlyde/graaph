<template>
    <div>
        <div class="overflow-x-auto">
            <table class="w-full min-w-[32rem] border-separate border-spacing-1 text-center text-xs">
                <thead>
                    <tr>
                        <th scope="col" class="px-2 py-2 text-left font-medium text-zinc-500">Split</th>
                        <th v-for="period in periods" :key="period.key" scope="col" class="px-2 py-2 font-medium text-zinc-400">
                            {{ period.label }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in heatmapRows" :key="row.key">
                        <th scope="row" class="whitespace-nowrap px-2 py-2 text-left font-medium text-zinc-300">
                            {{ row.label }}
                        </th>
                        <td
                            v-for="cell in row.cells"
                            :key="cell.period.key"
                            class="border border-white/5 px-2 py-2 font-medium tabular-nums text-zinc-100"
                            :style="{ backgroundColor: cell.color }"
                            :aria-label="`${row.label}, ${cell.period.label}: ${formatMsToMinSec(cell.value) || 'no data'}`"
                            :title="`${row.label} · ${cell.period.label}: ${formatMsToMinSec(cell.value) || 'No data'}`"
                        >
                            {{ formatMsToMinSec(cell.value) || '—' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2 text-[11px] text-zinc-500">
            <span>Faster</span>
            <span class="h-2.5 w-20" style="background: linear-gradient(to right, #166534, #854d0e, #9f1239)" aria-hidden="true"></span>
            <span>Slower</span>
            <span class="ml-1">· relative within each cumulative split</span>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    splitData: {
        type: Object,
        required: true
    }
})

const periods = [
    { label: '24 hours', key: 'avg1d' },
    { label: '7 Days', key: 'avg7d' },
    { label: '30 Days', key: 'avg30d' },
    { label: 'All Time', key: 'avgAT' }
]
const splits = [
    { label: 'Overworld', key: 'overworld' },
    { label: 'Nether', key: 'nether' },
    { label: 'Bastion', key: 'bastion' },
    { label: 'Fortress', key: 'fortress' },
    { label: 'Stronghold', key: 'stronghold' },
    { label: 'End', key: 'end' },
    { label: 'Outer End', key: 'elytra' }
]
const colorStops = [[22, 101, 52], [133, 77, 14], [159, 18, 57]]

const heatmapRows = computed(() => splits.map(split => {
    const splitIndex = splits.findIndex(item => item.key === split.key)
    const values = periods.map(period => {
        let cumulativeTime = 0

        for (let index = 0; index <= splitIndex; index++) {
            const splitTime = props.splitData[splits[index].key][period.key]
            if (!Number.isFinite(splitTime)) return undefined
            cumulativeTime += splitTime
        }

        return cumulativeTime
    })
    const availableValues = values.filter(Number.isFinite)
    const min = availableValues.length ? Math.min(...availableValues) : 0
    const max = availableValues.length ? Math.max(...availableValues) : 0

    return {
        ...split,
        cells: periods.map((period, index) => {
            const value = values[index]
            if (!Number.isFinite(value)) return { period, value, color: 'rgba(255, 255, 255, 0.04)' }

            const ratio = min === max ? 0.5 : (value - min) / (max - min)
            const scaledRatio = ratio * (colorStops.length - 1)
            const lowerStopIndex = Math.floor(scaledRatio)
            const upperStopIndex = Math.min(lowerStopIndex + 1, colorStops.length - 1)
            const stopRatio = scaledRatio - lowerStopIndex
            const color = colorStops[lowerStopIndex].map((channel, colorIndex) =>
                Math.round(channel + (colorStops[upperStopIndex][colorIndex] - channel) * stopRatio)
            )

            return { period, value, color: `rgb(${color.join(', ')})` }
        })
    }
}))

function formatMsToMinSec(ms) {
    if (!Number.isFinite(ms)) return ''
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>
