<template>
  <div>
    <div v-if="loading" class="flex h-72 items-center justify-center text-sm text-zinc-400" role="status">
      Loading run history...
    </div>
    <p v-else-if="error" class="flex h-72 items-center justify-center text-sm text-red-200" role="alert">
      Unable to load the progression sheet.
    </p>
    <div v-else class="relative h-72 sm:h-96">
      <p v-if="!records.length" class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-zinc-500">
        No run history
      </p>
      <div
        v-if="activeInterval"
        class="absolute inset-0 pointer-events-none"
        :style="{
          background: `linear-gradient(90deg, transparent ${activeInterval.left}px, rgba(255,255,255,0.08) ${activeInterval.left}px, rgba(255,255,255,0.08) ${activeInterval.right}px, transparent ${activeInterval.right}px)`
        }"
      />
      <Line :data="chartData" :options="chartOptions" :plugins="[hoverHighlightPlugin]" />
      <div
        v-if="tooltip"
        class="pointer-events-none absolute z-10 w-max whitespace-nowrap rounded border border-white/15 bg-[#101011] px-3 py-2 text-xs text-white shadow-lg"
        :style="{
          left: `${tooltip.x}px`,
          top: `${tooltip.y}px`,
          transform: `translate(${tooltip.alignRight ? '-100%' : '0'}, ${tooltip.alignBottom ? '-100%' : '0'})`
        }"
        role="tooltip"
      >
        <div class="-mx-3 mb-1 border-b border-white/15 px-3 pb-1 font-semibold">{{ tooltip.title }}</div>
        <div><span class="text-[#27AE60]">{{ tooltip.time }}</span> IGT</div>
        <div>{{ tooltip.date }}</div>
        <div>
          <template v-if="tooltip.isCurrent"><span class="text-[#27AE60]">{{ tooltip.days }}</span> days ago</template>
          <template v-else-if="tooltip.days !== null">Stood for <span class="text-[#27AE60]">{{ tooltip.days }}</span> days</template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale
} from 'chart.js'

ChartJS.register(LineController, LineElement, PointElement, LinearScale)

const props = defineProps({
  records: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  }
})

const activeInterval = ref(null)
const hovered = ref(null)

const formatDuration = milliseconds => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const tooltip = computed(() => {
  if (!hovered.value) return null
  const { index } = hovered.value
  const record = props.records[index]
  if (!record) return null

  const recordsByTime = [...props.records].sort((a, b) => a.time - b.time)
  const isCurrent = record.time === recordsByTime[0].time
  const nextPB = props.records.slice(index + 1).find(next => next.time < record.time)
  const end = isCurrent ? Date.now() : nextPB?.timestamp

  return {
    ...hovered.value,
    title: isCurrent ? 'Current PB' : `Former PB #${recordsByTime.findIndex(item => item.time === record.time)}`,
    time: formatDuration(record.time),
    date: new Date(record.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }),
    isCurrent,
    days: end == null ? null : Math.floor((end - record.timestamp) / (1000 * 60 * 60 * 24))
  }
})

const chartData = computed(() => {
  const points = props.records.map(record => ({ x: record.timestamp, y: record.time }))
  const lastRecord = points[points.length - 1]
  if (lastRecord && lastRecord.x < Date.now()) {
    points.push({ x: Date.now(), y: lastRecord.y })
  }

  return {
    labels: [],
    datasets: [{
      data: points,
      borderColor: '#cbd5e1',
      backgroundColor: '#27AE60',
      borderWidth: 2,
      pointRadius: context => context.dataIndex < props.records.length ? 6 : 0,
      pointHoverRadius: context => context.dataIndex < props.records.length ? 8 : 0,
      pointBorderColor: '#151517',
      pointBorderWidth: 2,
      pointStyle: 'rect',
      stepped: 'before',
      tension: 0
    }]
  }
})

const chartOptions = computed(() => {
  const times = props.records.map(record => record.time)
  const hour = 60 * 60 * 1000
  const hasRecords = times.length > 0
  const fastest = hasRecords ? Math.min(...times) : 0
  const slowest = hasRecords ? Math.max(...times) : 0
  const padding = hasRecords ? Math.max((slowest - fastest) * 0.12, fastest * 0.04) : 0
  const minTime = hasRecords ? Math.max(0, Math.floor((fastest - padding) / hour) * hour) : 0
  const maxTime = hasRecords ? Math.max(minTime + hour, Math.ceil((slowest + padding) / hour) * hour) : hour
  let hourStep = Math.max(1, Math.ceil((maxTime - minTime) / hour / 6)) * hour
  while (Math.ceil(maxTime / hourStep) - Math.floor(minTime / hourStep) > 6) {
    hourStep += hour
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { intersect: false, mode: 'index' },
    layout: { padding: { top: 12, right: 12 } },
    plugins: {
      legend: { display: false },
      datalabels: false,
      tooltip: { enabled: false }
    },
    scales: {
      x: {
        type: 'linear',
        min: props.records[0]?.timestamp ?? Date.now() - 365 * 24 * hour,
        max: Math.max(Date.now(), props.records[props.records.length - 1]?.timestamp ?? 0),
        ticks: {
          color: '#71717a',
          maxTicksLimit: 7,
          callback: value => new Date(value).toLocaleDateString('en-GB', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            timeZone: 'UTC'
          })
        },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        border: { display: false }
      },
      y: {
        min: Math.floor(minTime / hourStep) * hourStep,
        max: Math.ceil(maxTime / hourStep) * hourStep,
        ticks: {
          color: '#71717a',
          maxTicksLimit: 7,
          stepSize: hourStep,
          callback: value => `${String(value / hour).padStart(2, '0')}:00`
        },
        grid: { color: 'rgba(255, 255, 255, 0.12)' },
        border: { display: false }
      }
    }
  }
})

const hoverHighlightPlugin = {
  id: 'progressionHover',
  afterEvent(chart, { event, inChartArea }) {
    if (event.type === 'mouseout' || !inChartArea) {
      activeInterval.value = null
      hovered.value = null
      return
    }
    if (event.type !== 'mousemove') return

    const scale = chart.scales.x
    const timestamp = scale.getValueForPixel(event.x)
    let index = props.records.length - 1
    while (index >= 0 && props.records[index].timestamp > timestamp) index--
    if (index < 0) {
      activeInterval.value = null
      hovered.value = null
      return
    }

    const next = props.records[index + 1]
    activeInterval.value = {
      left: scale.getPixelForValue(props.records[index].timestamp),
      right: next ? scale.getPixelForValue(next.timestamp) : chart.chartArea.right
    }
    const alignRight = event.x > chart.width / 2
    const alignBottom = event.y > chart.height / 2
    hovered.value = {
      index,
      x: event.x + (alignRight ? -12 : 12),
      y: event.y + (alignBottom ? -12 : 12),
      alignRight,
      alignBottom
    }
  }
}
</script>
