<template>
    <div
        class="pointer-events-none absolute z-10 w-max whitespace-nowrap border border-white/15 bg-[#101011] px-3 py-2 text-xs text-white shadow-lg"
        :style="{ left: `${props.x}px`, top: `${props.y}px`, transform: tooltipTransform }"
        role="tooltip"
    >
        <div>
            {{ props.splitName }}: <span class="text-[#27AE60]">{{ props.split.counter }}</span> runs ({{ formatRank(props.split.lbCounter) }})
        </div>
        <div v-if="props.conversion">
            Conversion: <span class="text-[#27AE60]">{{ formatConversion(props.conversion.rate) }}</span> ({{ formatRank(props.conversion.rank) }})
        </div>
        <div>
            Fastest: <span class="text-[#27AE60]">{{ formatMsToMinSec(props.split.fastest) }}</span> ({{ formatRank(props.split.lbFastest) }})
        </div>
        <div>
            Average: <span class="text-[#27AE60]">{{ formatMsToMinSec(props.split.avg) }}</span> ({{ formatRank(props.split.lbAvg) }})
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    splitName: {
        type: String,
        required: true
    },
    split: {
        type: Object,
        required: true
    },
    conversion: {
        type: Object,
        default: null
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    alignRight: {
        type: Boolean,
        default: false
    },
    alignCenter: {
        type: Boolean,
        default: false
    },
    anchorToPoint: {
        type: Boolean,
        default: false
    },
    centerVertically: {
        type: Boolean,
        default: false
    },
    placeBelow: {
        type: Boolean,
        default: false
    }
})

const tooltipTransform = computed(() => {
    const transforms = []
    if (props.alignCenter) transforms.push('translateX(-50%)')
    else if (props.alignRight) transforms.push('translateX(-100%)')
    if (props.centerVertically) transforms.push('translateY(-50%)')
    else if (props.anchorToPoint && !props.placeBelow) transforms.push('translateY(-100%)')
    return transforms.length ? transforms.join(' ') : undefined
})

function formatRank(rank) {
    return rank == null ? '—' : `#${rank}`
}

function formatConversion(rate) {
    return Number.isFinite(rate) ? `${rate.toFixed(1)}%` : '—'
}

function formatMsToMinSec(ms) {
    if (!Number.isFinite(ms)) return ''
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>
