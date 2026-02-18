<script setup lang="ts">
import type { FormItem, TreeItem } from '../../../types'
import type { PropType } from 'vue'
import { ref, computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import { isDocumentFile, getFileIcon } from '../../../utils/file'

defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel<string>({ default: '' })

const { mediaTree } = useStudio()

const popoverOpen = ref(false)
const search = ref('')

// Collect all document files from media tree
const allDocumentFiles = computed(() => {
  const documents: TreeItem[] = []

  const collectDocuments = (items: TreeItem[]) => {
    for (const item of items) {
      if (item.type === 'file' && isDocumentFile(item.fsPath)) {
        documents.push(item)
      }
      if (item.children) {
        collectDocuments(item.children)
      }
    }
  }

  collectDocuments(mediaTree.root.value)

  return documents
})

// Filter by search and limit to 8
const documentFiles = computed(() => {
  let files = allDocumentFiles.value

  if (search.value) {
    const query = search.value.toLowerCase()
    files = files.filter(file => file.name.toLowerCase().includes(query))
  }

  return files.slice(0, 8)
})

function selectFile(file: TreeItem) {
  model.value = file.routePath || file.fsPath
  popoverOpen.value = false
  search.value = ''
}

const selectedFileIcon = computed(() => {
  if (!model.value) return 'i-lucide-file'
  return getFileIcon(model.value)
})
</script>

<template>
  <div class="flex items-center gap-1">
    <div
      class="flex items-center justify-center size-6 bg-muted border border-muted rounded shrink-0 overflow-hidden"
    >
      <UIcon
        :name="selectedFileIcon"
        class="text-dimmed"
        size="xs"
      />
    </div>

    <UInput
      v-model="model"
      placeholder="Select a file..."
      size="xs"
      class="flex-1"
    >
      <template #trailing>
        <UPopover
          v-model:open="popoverOpen"
          :portal="false"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="none"
            icon="i-lucide-search"
            class="cursor-pointer"
          />

          <template #content>
            <div class="p-3 w-80">
              <UInput
                v-model="search"
                placeholder="Search files..."
                size="xs"
                icon="i-lucide-search"
                autofocus
                class="mb-3 w-full"
              />

              <div
                v-if="documentFiles.length === 0"
                class="text-center py-4"
              >
                <UIcon
                  name="i-lucide-file-x"
                  class="size-8 mx-auto mb-2 text-muted"
                />
                <p class="text-xs text-muted">
                  {{ search ? 'No files found' : 'No files available' }}
                </p>
              </div>

              <div
                v-else
                class="flex flex-col gap-1"
              >
                <UTooltip
                  v-for="file in documentFiles"
                  :key="file.fsPath"
                  :text="file.routePath || file.fsPath"
                >
                  <button
                    type="button"
                    class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md cursor-pointer border border-transparent hover:bg-muted hover:border-muted transition-all text-left"
                    @click="selectFile(file)"
                  >
                    <UIcon
                      :name="getFileIcon(file.fsPath)"
                      class="text-dimmed shrink-0"
                      size="sm"
                    />
                    <span class="text-xs truncate">{{ file.name }}</span>
                  </button>
                </UTooltip>
              </div>

              <p
                v-if="documentFiles.length > 0"
                class="text-xs text-dimmed mt-2"
              >
                Showing {{ documentFiles.length }} of {{ allDocumentFiles.length }} files
              </p>
            </div>
          </template>
        </UPopover>
      </template>
    </UInput>
  </div>
</template>
