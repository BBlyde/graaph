<template>
  <div>
    {{ advancedData.place }}
    <!-- {{ advancedData }} -->
  </div>
</template>

<script setup>

const props = defineProps({
  advancedData: Object
})

</script>