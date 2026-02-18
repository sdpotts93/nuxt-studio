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
const dragOverIndex = ref<number | null>(null)

const maxIdLength = 24
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.tif', '.tiff']

type ItemMeta
  = | { type: 'text', display: string, full: string }
    | { type: 'image', src: string }

function isImagePath(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  if (normalized.startsWith('data:image/')) return true
  const withoutQuery = normalized.split('?')[0]
  return imageExtensions.some(ext => withoutQuery.endsWith(ext))
}

function findFirstText(value: unknown, seen: Set<unknown>): string | null {
  if (typeof value === 'string') {
    return isImagePath(value) ? null : value
  }
  if (!value || typeof value !== 'object') return null
  if (seen.has(value)) return null
  seen.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstText(item, seen)
      if (found) return found
    }
    return null
  }

  for (const key of Object.keys(value)) {
    const found = findFirstText((value as Record<string, unknown>)[key], seen)
    if (found) return found
  }

  return null
}

function findFirstImage(value: unknown, seen: Set<unknown>): string | null {
  if (typeof value === 'string') {
    return isImagePath(value) ? value : null
  }
  if (!value || typeof value !== 'object') return null
  if (seen.has(value)) return null
  seen.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstImage(item, seen)
      if (found) return found
    }
    return null
  }

  for (const key of Object.keys(value)) {
    const found = findFirstImage((value as Record<string, unknown>)[key], seen)
    if (found) return found
  }

  return null
}

function getItemMeta(value: unknown): ItemMeta | null {
  const text = findFirstText(value, new Set())
  if (text) {
    const full = text.trim()
    if (!full) return null

    const maxLength = Math.max(3, maxIdLength)
    const display = full.length > maxLength
      ? `${full.slice(0, maxLength - 3).trimEnd()}...`
      : full

    return { type: 'text', display, full }
  }

  const image = findFirstImage(value, new Set())
  if (!image) return null

  return { type: 'image', src: image }
}

// Computed items for display
const items = computed(() => {
  return (model.value || []).map((item, index) => ({
    key: index,
    index,
    value: item,
    label: `${itemsLabel.value} ${index + 1}`,
    id: itemsType.value === 'object' ? getItemMeta(item) : null,
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
      dragOverIndex.value = null
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
      dragOverIndex.value = index
    },
    onDragover: (e: DragEvent) => {
      e.preventDefault()
      dragOverIndex.value = index
    },
    onDrop: () => {
      dragIndex.value = null
      dragOverIndex.value = null
    },
  }
}
</script>

<template>
  <div>
    <!-- Array of Objects -->
    <template v-if="itemsType === 'object'">
      <div class="flex flex-col gap-2">
        <div
          v-for="item in items"
          :key="item.index"
          class="relative"
          v-bind="getDropZoneProps(item.index)"
        >
          <div
            v-if="dragIndex !== null && dragOverIndex === item.index"
            class="absolute -top-1 left-0 right-0 h-px bg-primary/70"
          />
          <Collapsible
            :open="activeIndex === item.index"
            :label="item.label"
            class="group/item"
            @update:open="(open: boolean) => activeIndex = open ? item.index : null"
          >
            <template #badge>
              <div class="flex items-center gap-1 min-w-0">
                <img
                  v-if="item.id?.type === 'image'"
                  :src="item.id.src"
                  :alt="item.label"
                  class="size-5 rounded border border-muted object-cover bg-muted"
                >
                <span
                  v-else-if="item.id?.type === 'text'"
                  class="text-xs text-muted max-w-36 truncate"
                  :title="item.id.full"
                >
                  {{ item.id.display }}
                </span>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="2xs"
                  icon="i-lucide-grip-vertical"
                  class="cursor-grab text-muted opacity-0 group-hover/item:opacity-100 transition-opacity"
                  v-bind="getDragHandleProps(item.index)"
                />
              </div>
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
      </div>
    </template>

    <!-- Array of Strings -->
    <template v-else-if="itemsType === 'string'">
      <div class="flex flex-wrap items-center gap-1.5">
        <div
          v-for="item in items"
          :key="item.label"
          class="relative flex items-center gap-1"
          v-bind="getDropZoneProps(item.index)"
        >
          <div
            v-if="dragIndex !== null && dragOverIndex === item.index"
            class="absolute -top-1 left-0 right-0 h-px bg-primary/70"
          />
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
