<template>
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <div>
    <div class="metric-title" data-cy="metric-title">
      <slot></slot>
    </div>
    <div>
      Value: <span data-cy="value">{{ value }}</span>
    </div>
    <div>
      Color: <span data-cy="color">{{ color }}</span>
    </div>
    <div class="metric-value" data-cy="metric-value" style="height: 10px"></div>
    <div v-show="dataValid" data-cy="data-valid">Data is valid</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: number | string
  color?: string
  dataValid: boolean
  pageHeight?: number
}>()
</script>
