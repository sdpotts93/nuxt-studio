<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormItem, FormTree, FormInputsTypes } from '../../types'
import type { Component, PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { applyValueById } from '../../utils/form'
import FormInputArray from './input/FormInputArray.vue'
import InputBoolean from './input/InputBoolean.vue'
import InputDate from './input/InputDate.vue'
import InputIcon from './input/InputIcon.vue'
import InputMedia from './input/InputMedia.vue'
import InputFile from './input/InputFile.vue'
import InputNumber from './input/InputNumber.vue'
import InputText from './input/InputText.vue'
import InputColor from './input/InputColor.vue'
import { isColorLikeField } from '../../utils/formColorHeuristics'
import { isImageLikeField } from '../../utils/formMediaHeuristics'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    required: true,
  },
})

const form = defineModel({ type: Object as PropType<FormTree>, default: () => ({}) })

const label = computed(() => titleCase(props.formItem.title))

const typeComponentMap: Partial<Record<FormInputsTypes, Component>> = {
  array: FormInputArray,
  boolean: InputBoolean,
  date: InputDate,
  datetime: InputDate,
  icon: InputIcon,
  media: InputMedia,
  file: InputFile,
  color: InputColor,
  link: InputText,
  number: InputNumber,
  string: InputText,
}

const inputComponentName = computed(() => {
  const type = props.formItem.type

  // Don't override array or object types
  if (type === 'array' || type === 'object') {
    return typeComponentMap[type] ?? InputText
  }

  if (type === 'color') {
    return InputColor
  }

  if (type === 'link') {
    return InputText
  }

  if (type === 'file') {
    return InputFile
  }

  // Check if this looks like an image field
  if (isColorLikeField({ key: props.formItem.key, title: props.formItem.title, id: props.formItem.id })) {
    return InputColor
  }

  if (isImageLikeField({ key: props.formItem.key, title: props.formItem.title, id: props.formItem.id })) {
    return InputMedia
  }

  return typeComponentMap[type] ?? InputText
})

const inputFormItem = computed(() => {
  return props.formItem.type === 'array' ? props.formItem.arrayItemForm : props.formItem
})

// Initialize model value
const model = ref(computeValue(props.formItem))

// Sync changes back to parent form
watch(model, (newValue) => {
  if (newValue === props.formItem.value) {
    return
  }

  form.value = applyValueById(form.value, props.formItem.id, newValue)
}, { deep: true })

// Watch for external form item changes
watch(() => props.formItem, (newFormItem) => {
  model.value = computeValue(newFormItem)
}, { deep: true })

function computeValue(formItem: FormItem): unknown {
  const value = formItem.value

  switch (formItem.type) {
    case 'string':
    case 'date':
    case 'datetime':
    case 'icon':
    case 'media':
    case 'file':
    case 'color':
    case 'link':
      return typeof value === 'string' ? value : ''
    case 'boolean':
      return typeof value === 'boolean' ? value : false
    case 'number':
      return typeof value === 'number' ? value : 0
    case 'array':
      return Array.isArray(value) ? value : []
    case 'object':
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    default:
      return value ?? null
  }
}
</script>

<template>
  <UFormField
    :name="formItem.id"
    :label="label"
    :ui="{
      root: 'w-full mt-2',
      label: 'text-xs font-semibold tracking-tight',
    }"
  >
    <component
      :is="inputComponentName"
      v-model="model"
      :form-item="inputFormItem"
    />
  </UFormField>
</template>
