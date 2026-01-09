<script setup lang="ts">
import type { TreeItem } from '../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { getFileIcon } from '../../utils/file'
import { findParentFromFsPath, findItemFromFsPath } from '../../utils/tree'
import { useStudio } from '../../composables/useStudio'
import { StudioItemActionId } from '../../types'
import ContentCardForm from './ContentCardForm.vue'

const { context } = useStudio()

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
  showRenameForm: {
    type: Boolean,
    default: false,
  },
})

const itemExtensionIcon = computed(() => getFileIcon(props.item.fsPath))

// Get the parent folder of the item being renamed (not currentItem which might be the file itself)
const parentItem = computed(() => {
  const parent = findParentFromFsPath(context.activeTree.value.root.value, props.item.fsPath)
  if (parent) return parent

  // Fallback: calculate parent fsPath from item's fsPath
  // e.g., "especiales/smart-stay-copy.md" -> parent fsPath = "especiales"
  const pathParts = props.item.fsPath.split('/')
  if (pathParts.length > 1) {
    const parentFsPath = pathParts.slice(0, -1).join('/')
    // Try to find the parent folder in the tree
    const parentFromPath = findItemFromFsPath(context.activeTree.value.root.value, parentFsPath)
    if (parentFromPath) return parentFromPath
    // If still not found, create a minimal parent object with correct fsPath
    return {
      ...context.activeTree.value.rootItem.value,
      fsPath: parentFsPath,
    }
  }

  return context.activeTree.value.rootItem.value
})
</script>

<template>
  <ContentCardForm
    v-if="showRenameForm"
    :renamed-item="props.item"
    :parent-item="parentItem"
    :action-id="StudioItemActionId.RenameItem"
  />
  <ItemCard
    v-else
    :item="item"
  >
    <template #thumbnail>
      <div class="w-full h-full flex items-center justify-center">
        <UIcon
          :name="itemExtensionIcon"
          class="w-6 h-6 text-muted"
        />
      </div>
    </template>
    <template #name-prefix>
      <UIcon
        v-if="item.name === 'home'"
        name="i-lucide-house"
        class="size-3.5 shrink-0 text-muted"
      />
      <UBadge
        v-else-if="item.prefix"
        :label="item.prefix.toString()"
        size="xs"
        variant="soft"
        class="bg-elevated"
      />
    </template>
  </ItemCard>
</template>
