<template>
    <div
        class="pointer-events-none absolute z-10 border border-white/15 bg-[#101011] px-3 py-2 text-xs text-white shadow-lg"
        :style="{ left: `${props.x}px`, top: `${props.y}px` }"
        role="tooltip"
    >
        <div>
            {{ props.splitName }}: <span class="text-[#27AE60]">{{ props.split.counter }}</span> runs ({{ formatRank(props.split.lbCounter) }})
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
const props = defineProps({
    splitName: {
        type: String,
        required: true
    },
    split: {
        type: Object,
        required: true
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    }
})

function formatRank(rank) {
    return rank == null ? '—' : `#${rank}`
}

function formatMsToMinSec(ms) {
    if (!Number.isFinite(ms)) return ''
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>
