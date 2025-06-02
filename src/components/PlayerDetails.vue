<template>
  <div>
    {{  player.place }}
    {{  player }}
  </div>
</template>

<script setup>

const props = defineProps({
  player: Object
})

</script>