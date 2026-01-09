<script setup lang="ts">
import type { TreeItem } from '../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { Image } from '@unpic/vue'
import { isImageFile } from '../../utils/file'
import { findParentFromFsPath, findItemFromFsPath } from '../../utils/tree'
import { useStudio } from '../../composables/useStudio'
import { StudioItemActionId } from '../../types'
import MediaCardForm from './MediaCardForm.vue'

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

const imageSrc = computed(() => isImageFile(props.item.fsPath) ? props.item.routePath : null)

// Get the parent folder of the item being renamed (not currentItem which might be the file itself)
const parentItem = computed(() => {
  const parent = findParentFromFsPath(context.activeTree.value.root.value, props.item.fsPath)
  if (parent) return parent

  // Fallback: calculate parent fsPath from item's fsPath
  // e.g., "images/photo.jpg" -> parent fsPath = "images"
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
  <MediaCardForm
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
      <div
        v-if="imageSrc"
        class="w-full h-full bg-[linear-gradient(45deg,#e6e9ea_25%,transparent_0),linear-gradient
        (-45deg,#e6e9ea_25%,transparent_0),linear-gradient(45deg,transparent_75%,#e6e9ea_0),
        linear-gradient(-45deg,transparent_75%,#e6e9ea_0)]"
      >
        <Image
          :src="imageSrc"
          width="48"
          height="48"
          :alt="$t('studio.media.altFilePreview')"
          class="w-full h-full object-cover"
        />
      </div>
      <div
        v-else
        class="flex items-center justify-center h-full"
      >
        <UIcon
          name="i-lucide-play"
          class="w-6 h-6 text-muted"
        />
      </div>
    </template>
  </ItemCard>
</template>
