<script setup lang="ts">
import { computed } from 'vue'

const model = defineModel<string>({ default: '' })

const swatchValue = computed(() => {
  const value = (model.value || '').trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
    return value
  }
  return '#000000'
})

function updateFromPicker(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  model.value = target.value
}
</script>

<template>
  <div class="flex items-center gap-2 w-full">
    <input
      type="color"
      :value="swatchValue"
      class="size-6 rounded border border-default bg-transparent p-0"
      @input="updateFromPicker"
    >
    <UInput
      v-model="model"
      size="xs"
      class="flex-1"
      placeholder="#000000"
    />
  </div>
</template>
