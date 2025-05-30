<template>
  <div class="min-h-screen flex flex-col font-primary text-white" style="background-color: #1A1A1A;">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
</script>