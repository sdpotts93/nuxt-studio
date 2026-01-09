<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormItem } from '../../../types'
import type { PropType } from 'vue'
import { computed, nextTick, ref } from 'vue'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel({ type: Array as PropType<unknown[]>, default: () => [] })

const itemsType = computed(() => props.formItem?.type)
const itemsLabel = computed(() => titleCase(props.formItem?.title))

const activeIndex = ref<number | null>(null)
const stringEditingValue = ref('')
const dragIndex = ref<number | null>(null)

// Computed items for display
const items = computed(() => {
  return (model.value || []).map((item, index) => ({
    key: index,
    index,
    value: item,
    label: `${itemsLabel.value} ${index + 1}`,
  }))
})

function addItem() {
  const newItem = itemsType.value === 'object' ? {} : ''

  model.value = [...(model.value || []), newItem]

  // Auto-focus new string item
  if (itemsType.value === 'string') {
    nextTick(() => {
      startStringEditing(model.value.length - 1)
    })
  }
}

function deleteItem(index: number) {
  model.value = model.value.filter((_, i) => i !== index)
  if (activeIndex.value === index) {
    activeIndex.value = null
  }
  // Reset drag index if needed
  if (dragIndex.value !== null && dragIndex.value >= model.value.length) {
    dragIndex.value = null
  }
}

function startStringEditing(index: number, value?: unknown) {
  activeIndex.value = index
  stringEditingValue.value = String(value || '')
}

function saveStringEditing() {
  if (activeIndex.value !== null) {
    model.value = model.value.map((item, i) =>
      i === activeIndex.value ? stringEditingValue.value : item,
    )
  }
  activeIndex.value = null
  stringEditingValue.value = ''
}

function updateObjectItem(index: number, value: Record<string, unknown>) {
  model.value = model.value.map((item, i) => i === index ? value : item)
}

// Drag and drop reordering
function moveItem(fromIndex: number, toIndex: number) {
  const arr = [...(model.value || [])]
  if (!arr.length) return

  const [item] = arr.splice(fromIndex, 1)
  arr.splice(toIndex, 0, item)
  model.value = arr

  // Update activeIndex if needed
  if (activeIndex.value !== null) {
    if (activeIndex.value === fromIndex) {
      activeIndex.value = toIndex
    }
    else if (activeIndex.value > fromIndex && activeIndex.value <= toIndex) {
      activeIndex.value = activeIndex.value - 1
    }
    else if (activeIndex.value < fromIndex && activeIndex.value >= toIndex) {
      activeIndex.value = activeIndex.value + 1
    }
  }
  dragIndex.value = toIndex
}

function getDragHandleProps(index: number) {
  return {
    draggable: true,
    onDragstart: (e: DragEvent) => {
      e.dataTransfer?.setData('text/plain', '')
      dragIndex.value = index
    },
    onDragend: () => {
      dragIndex.value = null
    },
  }
}

function getDropZoneProps(index: number) {
  return {
    onDragenter: (e: DragEvent) => {
      e.preventDefault()
      if (dragIndex.value !== null && dragIndex.value !== index) {
        moveItem(dragIndex.value, index)
      }
    },
    onDragover: (e: DragEvent) => e.preventDefault(),
    onDrop: () => {
      dragIndex.value = null
    },
  }
}
</script>

<template>
  <div>
    <!-- Array of Objects -->
    <template v-if="itemsType === 'object'">
      <div class="flex flex-col gap-2">
        <Collapsible
          v-for="item in items"
          :key="item.index"
          :open="activeIndex === item.index"
          :label="item.label"
          class="group/item"
          v-bind="getDropZoneProps(item.index)"
          @update:open="(open: boolean) => activeIndex = open ? item.index : null"
        >
          <template #badge>
            <UButton
              variant="ghost"
              color="neutral"
              size="2xs"
              icon="i-lucide-grip-vertical"
              class="cursor-grab text-muted opacity-0 group-hover/item:opacity-100 transition-opacity"
              v-bind="getDragHandleProps(item.index)"
            />
          </template>
          <template #actions>
            <UButton
              variant="ghost"
              color="neutral"
              size="2xs"
              icon="i-lucide-trash"
              class="opacity-0 group-hover/item:opacity-100 transition-opacity"
              :aria-label="$t('studio.form.deleteItem')"
              @click.stop="deleteItem(item.index)"
            />
          </template>

          <FormInputObject
            v-model="(item.value as Record<string, unknown>)"
            :children="formItem.children"
            @update:model-value="updateObjectItem(item.index, $event)"
          />
        </Collapsible>
      </div>
    </template>

    <!-- Array of Strings -->
    <template v-else-if="itemsType === 'string'">
      <div class="flex flex-wrap items-center gap-1.5">
        <div
          v-for="item in items"
          :key="item.label"
          class="flex items-center gap-1"
          v-bind="getDropZoneProps(item.index)"
        >
          <UBadge
            variant="subtle"
            color="neutral"
            size="xs"
            class="min-w-0"
          >
            <UInput
              v-if="activeIndex === item.index"
              v-model="stringEditingValue"
              size="xs"
              variant="none"
              class="w-24 -my-1"
              autofocus
              @keypress.enter="saveStringEditing"
              @blur="saveStringEditing"
            />
            <span
              v-else
              class="truncate max-w-32 text-xs"
            >
              {{ item.value }}
            </span>

            <div class="flex items-center shrink-0">
              <UButton
                variant="ghost"
                color="neutral"
                size="2xs"
                icon="i-lucide-grip-vertical"
                class="cursor-grab"
                v-bind="getDragHandleProps(item.index)"
              />
              <UButton
                variant="ghost"
                color="neutral"
                size="2xs"
                :icon="activeIndex === item.index ? 'i-lucide-check' : 'i-lucide-pencil'"
                :class="{ 'font-medium': activeIndex === item.index }"
                :aria-label="$t('studio.form.editItem')"
                @click.stop="activeIndex === item.index ? saveStringEditing() : startStringEditing(item.index, item.value)"
              />
              <UButton
                variant="ghost"
                color="neutral"
                size="2xs"
                :icon="activeIndex === item.index ? 'i-lucide-x' : 'i-lucide-trash'"
                :aria-label="$t('studio.form.deleteItem')"
                @click.stop="deleteItem(item.index)"
              />
            </div>
          </UBadge>
        </div>
      </div>
    </template>

    <!-- Unsupported type fallback -->
    <div
      v-else
      class="flex items-center justify-center py-2 rounded-lg border border-dashed border-muted"
    >
      <p class="text-xs text-muted">
        {{ $t('studio.form.array.unsupportedType', { type: itemsType || '' }) }}
      </p>
    </div>

    <!-- Add button -->
    <div
      v-if="itemsType"
      class="flex"
      :class="{ 'justify-end': items.length > 0 }"
    >
      <UButton
        variant="link"
        color="neutral"
        size="xs"
        icon="i-lucide-plus"
        @click="addItem"
      >
        {{ $t('studio.form.array.addItem', { label: itemsLabel.toLowerCase() }) }}
      </UButton>
    </div>
  </div>
</template>
