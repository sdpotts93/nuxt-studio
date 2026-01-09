<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormTree, FormInputsTypes } from '../../../types'
import type { Component, PropType } from 'vue'
import { computed } from 'vue'
import InputText from './InputText.vue'
import InputNumber from './InputNumber.vue'
import InputBoolean from './InputBoolean.vue'
import InputDate from './InputDate.vue'
import InputIcon from './InputIcon.vue'
import InputMedia from './InputMedia.vue'
import InputColor from './InputColor.vue'
import { isImageLikeField } from '../../../utils/formMediaHeuristics'
import { isColorLikeField } from '../../../utils/formColorHeuristics'
import FormInputArray from './FormInputArray.vue'

const props = defineProps({
  children: {
    type: Object as PropType<FormTree>,
    default: null,
  },
})

const model = defineModel({
  type: Object as PropType<Record<string, unknown>>,
  default: (): Record<string, unknown> => ({}),
})

// Map of type to component
const typeComponentMap: Partial<Record<FormInputsTypes, Component>> = {
  boolean: InputBoolean,
  date: InputDate,
  datetime: InputDate,
  icon: InputIcon,
  media: InputMedia,
  number: InputNumber,
  string: InputText,
  array: FormInputArray,
  object: undefined, // Will use FormInputObject recursively
}


// Get the appropriate component for a field
function getComponentForField(type: FormInputsTypes | undefined, key: string): Component {
  // If it's a string type but looks like a color field, use color picker
  if ((type === 'string' || !type) && isColorLikeField({ key })) {
    return InputColor
  }

  // If it's a string type but looks like an image field, use media picker
  if ((type === 'string' || !type) && isImageLikeField({ key })) {
    return InputMedia
  }
  return typeComponentMap[type || 'string'] ?? InputText
}

// Get the default value for a type
function getDefaultValue(type: FormInputsTypes | undefined): unknown {
  switch (type) {
    case 'boolean': return false
    case 'number': return 0
    case 'array': return []
    case 'object': return {}
    default: return ''
  }
}

const entries = computed(() => {
  if (!props.children) return []

  return Object.entries(props.children).map(([key, child]) => {
    const formItem = child as FormTree[string]
    return {
      key,
      label: titleCase(formItem.title || key),
      value: model.value?.[key] ?? formItem.default ?? getDefaultValue(formItem.type),
      type: formItem.type || 'string',
      formItem,
    }
  })
})

function updateValue(key: string, value: unknown) {
  model.value = { ...model.value, [key]: value }
}
</script>

<template>
  <div class="space-y-2 mt-1 ml-2 pl-3 border-l border-gray-200 dark:border-gray-700/50">
    <template v-if="entries.length">
      <UFormField
        v-for="entry in entries"
        :key="entry.key"
        :name="entry.key"
        :label="entry.label"
        :ui="{
          label: 'text-xs font-medium tracking-tight',
        }"
      >
        <!-- Nested object -->
        <FormInputObject
          v-if="entry.type === 'object'"
          :model-value="(entry.value as Record<string, unknown>) || {}"
          :children="entry.formItem.children || {}"
          class="w-full"
          @update:model-value="updateValue(entry.key, $event)"
        />
        <!-- Array -->
        <FormInputArray
          v-else-if="entry.type === 'array'"
          :model-value="Array.isArray(entry.value) ? entry.value : []"
          :form-item="entry.formItem.arrayItemForm || { id: '#array/items', type: 'string', title: 'Items' }"
          class="w-full"
          @update:model-value="updateValue(entry.key, $event)"
        />
        <!-- Other typed inputs -->
        <component
          v-else
          :is="getComponentForField(entry.type, entry.key)"
          :model-value="entry.value"
          :form-item="entry.formItem"
          class="w-full"
          @update:model-value="updateValue(entry.key, $event)"
        />
      </UFormField>
    </template>

    <div
      v-else
      class="flex flex-col items-center justify-center py-6 rounded-md border border-dashed border-muted"
    >
      <UIcon
        name="i-lucide-box"
        class="size-5 text-muted mb-2"
      />
      <p class="text-xs text-muted">
        {{ $t('studio.form.object.noProperties') }}
      </p>
    </div>
  </div>
</template>
