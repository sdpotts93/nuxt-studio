<script setup lang="ts">
import type { DraftItem } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { DraftStatus, StudioItemActionId } from '../../../types'
import { getFileIcon } from '../../../utils/file'
import { COLOR_UI_STATUS_MAP } from '../../../utils/tree'
import { useStudio } from '../../../composables/useStudio'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const { context } = useStudio()

const isOpen = defineModel<boolean>({ default: false })

const fileIcon = computed(() => getFileIcon(props.draftItem.fsPath))
const fileName = computed(() => props.draftItem.fsPath.split('/').pop() || props.draftItem.fsPath)
const filePath = computed(() => props.draftItem.fsPath)
const statusColor = computed(() => COLOR_UI_STATUS_MAP[props.draftItem.status as never])

const originalPath = computed(() => {
  if (props.draftItem.status !== DraftStatus.Created || !props.draftItem.original) {
    return null
  }

  return props.draftItem.original.fsPath
})

const isCreated = computed(() => props.draftItem.status === DraftStatus.Created)
const isDeleted = computed(() => props.draftItem.status === DraftStatus.Deleted)

const actionLabel = computed(() => {
  if (isCreated.value) return 'studio.actions.labels.deleteItem'
  if (isDeleted.value) return 'studio.actions.labels.restoreItem'
  return 'studio.actions.labels.revertItem'
})

const actionIcon = computed(() => {
  if (isCreated.value) return 'i-lucide-trash-2'
  if (isDeleted.value) return 'i-lucide-undo-2'
  return 'i-lucide-undo-2'
})

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function handleRevertOrDelete(event: Event) {
  event.stopPropagation()
  if (isCreated.value) {
    // For newly created files, delete them
    const action = context.itemActions.value.find(a => a.id === StudioItemActionId.DeleteItem)
    action?.handler?.({ fsPath: props.draftItem.fsPath, type: 'file' } as never)
  } else {
    // For modified/deleted files, revert changes (restores deleted files)
    const action = context.itemActions.value.find(a => a.id === StudioItemActionId.RevertItem)
    action?.handler?.({ fsPath: props.draftItem.fsPath, type: 'file' } as never)
  }
}
</script>

<template>
  <UCard
    class="overflow-hidden"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <div
      class="flex items-center justify-between gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
      @click="toggleOpen"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <UIcon
          :name="fileIcon"
          class="w-5 h-5 shrink-0 text-muted"
        />

        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium truncate">
              {{ fileName }}
            </span>
            <UBadge
              :label="$t(`studio.review.${draftItem.status.toLowerCase()}`)"
              :color="statusColor"
              variant="soft"
              size="xs"
            />
          </div>

          <div class="flex items-center gap-2 truncate text-xs">
            <div
              v-if="originalPath"
              class="flex items-center gap-2"
            >
              <span class="text-dimmed font-medium">{{ originalPath }}</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="w-3 h-3 text-dimmed shrink-0"
              />
            </div>
            <span class="text-muted italic">{{ filePath }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          :label="$t(actionLabel)"
          variant="ghost"
          color="error"
          size="xs"
          :icon="actionIcon"
          @click="handleRevertOrDelete"
        />
        <UIcon
          :name="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="w-5 h-5 text-muted transition-transform"
        />
      </div>
    </div>

    <div
      v-if="isOpen"
      class="border-t border-default"
    >
      <slot name="open" />
    </div>
  </UCard>
</template>
