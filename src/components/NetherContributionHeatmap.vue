<template>
  <div>
    <div class="space-y-4" role="region" aria-label="Daily Nether entries over the last 365 days">
      <section v-for="(half, halfIndex) in halfYears" :key="halfIndex" :class="{ 'mt-7': halfIndex === 0 }">
        <div v-if="halfIndex > 0" class="mb-4 border-t border-white/10" aria-hidden="true"></div>
        <div class="mb-2 flex justify-center">
          <div class="w-8 shrink-0" aria-hidden="true"></div>
          <div class="grid min-w-0 flex-1 gap-x-[5px]" :style="getWeekGridStyle(half.length)" aria-hidden="true">
            <span
              v-for="(week, index) in half"
              :key="index"
              class="h-4 min-w-0 whitespace-nowrap text-[10px] text-zinc-500"
            >
              {{ week.month }}
            </span>
          </div>
        </div>
        <div class="flex justify-center">
          <div class="grid w-8 shrink-0 grid-rows-7 gap-y-[5px] text-[10px] text-zinc-500" aria-hidden="true">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
          <div class="grid min-w-0 flex-1 gap-x-[5px]" :style="getWeekGridStyle(half.length)">
            <div v-for="(week, weekIndex) in half" :key="weekIndex" class="grid min-w-0 grid-rows-7 gap-y-[5px]">
              <span
                v-for="cell in week.days"
                :key="cell.date"
                class="aspect-square h-auto w-full max-w-[14px] rounded-[2px] outline outline-1 outline-white/5"
                :style="{ backgroundColor: cell.color }"
                :aria-label="cell.label"
                role="img"
                @mouseenter="showTooltip($event, cell)"
                @mouseleave="tooltip = null"
              ></span>
            </div>
          </div>
        </div>
      </section>
    </div>
    <div
      class="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-500"
      role="img"
      aria-label="Entry count intensity from less to more"
    >
      <span>Less</span>
      <span
        v-for="color in colors"
        :key="color"
        class="h-3 w-3 rounded-[2px] outline outline-1 outline-white/5"
        :style="{ backgroundColor: color }"
        aria-hidden="true"
      ></span>
      <span>More</span>
    </div>
    <div
      v-if="tooltip"
      class="pointer-events-none fixed z-[100] rounded border border-white/15 bg-[#09090b] px-2.5 py-1.5 text-xs text-zinc-100 shadow-xl"
      :style="{
        left: `${tooltip.left}px`,
        top: `${tooltip.top}px`,
        transform: 'translateY(-50%)'
      }"
      role="tooltip"
      aria-hidden="true"
    >
      <div><span class="font-semibold text-[#27AE60]">{{ tooltip.count }}</span> nether {{ tooltip.entryLabel }}</div>
      <div class="mt-0.5 text-zinc-400">{{ tooltip.date }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  runs: {
    type: Array,
    required: true
  }
})

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_COUNT = 365
const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
const tooltip = ref(null)

const today = new Date()
today.setUTCHours(0, 0, 0, 0)
const firstDay = new Date(today.getTime() - (DAY_COUNT - 1) * DAY_MS)
const gridStart = new Date(firstDay)
gridStart.setUTCDate(gridStart.getUTCDate() - ((gridStart.getUTCDay() + 6) % 7))

const dailyCounts = computed(() => {
  const counts = new Map()
  for (const run of props.runs) {
    const timestamp = Date.parse(run?.insertTime)
    if (!Number.isFinite(timestamp)) continue
    const date = new Date(timestamp).toISOString().slice(0, 10)
    if (date < firstDay.toISOString().slice(0, 10) || date > today.toISOString().slice(0, 10)) continue
    counts.set(date, (counts.get(date) || 0) + 1)
  }
  return counts
})

const weeks = computed(() => {
  const maxCount = Math.max(0, ...dailyCounts.value.values())
  const result = []

  for (let weekStart = new Date(gridStart); weekStart <= today; weekStart.setUTCDate(weekStart.getUTCDate() + 7)) {
    const days = []
    let month = ''

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(weekStart.getTime() + dayIndex * DAY_MS)
      const key = date.toISOString().slice(0, 10)
      const inRange = date >= firstDay && date <= today
      const count = inRange ? dailyCounts.value.get(key) || 0 : 0
      const level = count ? Math.min(4, Math.ceil((count / maxCount) * 4)) : 0
      const formattedDate = new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)

      if (inRange && date.getUTCDate() === 1) {
        month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date)
      }

      days.push({
        date: key,
        color: colors[level],
        label: inRange
          ? `${count} nether ${count === 1 ? 'entry' : 'entries'}, ${formattedDate}`
          : '',
        count,
        entryLabel: count === 1 ? 'entry' : 'entries',
        formattedDate
      })
    }

    result.push({ month, days })
  }

  return result
})

const halfYears = computed(() => {
  const splitIndex = Math.ceil(weeks.value.length / 2)
  return [
    weeks.value.slice(0, splitIndex),
    weeks.value.slice(splitIndex)
  ]
})

function getWeekGridStyle(weekCount) {
  return {
    gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
    maxWidth: `${weekCount * 14 + (weekCount - 1) * 5}px`
  }
}

function showTooltip(event, cell) {
  if (!cell.label) return

  const bounds = event.currentTarget.getBoundingClientRect()
  tooltip.value = {
    count: cell.count,
    entryLabel: cell.entryLabel,
    date: cell.formattedDate,
    left: bounds.right,
    top: bounds.top + bounds.height / 2
  }
}
</script>
