<template>
  <DefaultLayout>
    <RouterView></RouterView>
  </DefaultLayout>
</template>

<script setup>
import { RouterView } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue'
</script>