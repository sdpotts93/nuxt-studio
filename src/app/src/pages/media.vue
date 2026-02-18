<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudio } from '../composables/useStudio'
import { StudioItemActionId, StudioFeature } from '../types'
import { slugifyFileName } from '../utils/file'
import { joinURL, withLeadingSlash } from 'ufo'
import { useHooks } from '../composables/useHooks'

interface MediaUploadResult {
  name: string
  path: string
  status: 'success' | 'failed'
  reason?: string
}

const { context, mediaTree } = useStudio()
const hooks = useHooks()
const isUploading = ref(false)
const uploadingFileCount = ref(0)
const uploadResults = ref<MediaUploadResult[]>([])
const isUploadSummaryOpen = ref(false)

const folderTree = computed(() => (mediaTree.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (mediaTree.current.value || []).filter(f => f.type === 'file' && !f.fsPath.endsWith('.gitkeep')))

const currentTreeItem = computed(() => mediaTree.currentItem.value)
const currentDraftItem = computed(() => mediaTree.draft.current.value)
const successfulUploads = computed(() => uploadResults.value.filter(upload => upload.status === 'success'))
const failedUploads = computed(() => uploadResults.value.filter(upload => upload.status === 'failed'))

const showFolderForm = computed(() => {
  return context.actionInProgress.value?.id === StudioItemActionId.CreateMediaFolder
    || (
      context.actionInProgress.value?.id === StudioItemActionId.RenameItem
      && context.actionInProgress.value?.item?.type === 'directory'
    )
})

const showFileForm = computed(() => {
  return context.actionInProgress.value?.id === StudioItemActionId.CreateDocument
    || (
      context.actionInProgress.value?.id === StudioItemActionId.RenameItem
      && context.actionInProgress.value?.item?.type === 'file')
})

function getUploadPath(parentFsPath: string, file: File) {
  const slugifiedFileName = slugifyFileName(file.name)
  const fsPath = parentFsPath !== '/' ? joinURL(parentFsPath, slugifiedFileName) : slugifiedFileName
  return withLeadingSlash(fsPath)
}

async function onFileDrop(event: DragEvent) {
  if (currentDraftItem.value) {
    return
  }

  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  if (files.length > 0) {
    const parentFsPath = currentTreeItem.value.fsPath
    uploadResults.value = []
    uploadingFileCount.value = files.length
    isUploading.value = true
    try {
      for (const file of files) {
        const path = getUploadPath(parentFsPath, file)

        try {
          await context.itemActionHandler[StudioItemActionId.UploadMedia]({
            parentFsPath,
            files: [file],
          })

          uploadResults.value.push({
            name: file.name,
            path,
            status: 'success',
          })
        }
        catch (error) {
          uploadResults.value.push({
            name: file.name,
            path,
            status: 'failed',
            reason: error instanceof Error ? error.message : String(error),
          })
        }
      }

      // Ensure media tree is synced after batch upload, even if an intermediate refresh failed.
      try {
        await hooks.callHook('studio:draft:media:updated', { caller: 'media.onFileDrop' })
      }
      catch (error) {
        console.error('Failed to refresh media tree after upload batch', error)
      }

      isUploadSummaryOpen.value = true
    }
    finally {
      isUploading.value = false
      uploadingFileCount.value = 0
    }
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col"
    @drop.prevent.stop="onFileDrop"
    @dragover.prevent.stop
  >
    <div class="flex items-center justify-between gap-2 px-4 py-1 border-b-[0.5px] border-default bg-muted/70">
      <ItemBreadcrumb />
      <ItemActionsToolbar />
    </div>

    <div class="flex-1 relative">
      <div
        v-if="mediaTree.draft.isLoading.value"
        class="absolute inset-0 bg-primary/3 animate-pulse pointer-events-none"
      />

      <template v-else>
        <MediaEditor
          v-if="currentTreeItem.type === 'file' && currentDraftItem"
          :media-item="currentDraftItem.modified || currentDraftItem.original!"
          :remote-file="currentDraftItem.remoteFile!"
          :status="currentDraftItem.status"
        />
        <div
          v-else
          class="bg-default h-full"
          :class="{ 'bg-primary/3 animate-pulse': isUploading }"
        >
          <div class="flex flex-col p-4">
            <div v-if="folderTree?.length > 0 || showFolderForm">
              <div class="flex items-center gap-1 mb-3">
                <UIcon
                  name="i-lucide-folder"
                  class="size-3.5 text-muted"
                />
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">
                  {{ $t('studio.headings.directories') }}
                </h3>
                <UBadge
                  v-if="folderTree?.length > 0"
                  :label="folderTree.length.toString()"
                  color="neutral"
                  variant="soft"
                  size="xs"
                />
                <div class="flex-1 h-px bg-border ml-2" />
              </div>
              <ItemTree
                class="mb-6"
                :tree="folderTree"
                :show-form="showFolderForm"
                :feature="StudioFeature.Media"
              />
            </div>
            <div>
              <div class="flex items-center gap-1 mb-3">
                <UIcon
                  name="i-lucide-image"
                  class="size-3.5 text-muted"
                />
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">
                  {{ $t('studio.headings.media') }}
                </h3>
                <UBadge
                  :label="fileTree.length.toString()"
                  color="neutral"
                  variant="soft"
                  size="xs"
                />
                <div class="flex-1 h-px bg-border ml-2" />
              </div>
              <ItemTree
                :tree="fileTree"
                :show-form="showFileForm"
                :feature="StudioFeature.Media"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <UModal
      :open="isUploading"
      :title="$t('studio.media.upload.loadingTitle')"
      :description="$t('studio.media.upload.loadingDescription', uploadingFileCount)"
      :dismissible="false"
      :close="false"
    >
      <template #body>
        <div class="py-2 flex items-center justify-center">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-8 animate-spin text-primary"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isUploadSummaryOpen"
      :title="$t('studio.media.upload.summaryTitle')"
      :description="$t('studio.media.upload.summaryDescription', { success: successfulUploads.length, failed: failedUploads.length })"
    >
      <template #body>
        <div class="space-y-4">
          <div v-if="successfulUploads.length > 0">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              {{ $t('studio.media.upload.uploadedSection', successfulUploads.length) }}
            </h4>
            <ul
              class="max-h-64 overflow-auto divide-y divide-default rounded-md border border-default"
              aria-label="Uploaded files"
            >
              <li
                v-for="(upload, index) in successfulUploads"
                :key="`${upload.path}-${index}`"
                class="px-3 py-2 flex items-center gap-2"
              >
                <UIcon
                  name="i-lucide-file-check"
                  class="size-4 text-success shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-default truncate">
                    {{ upload.name }}
                  </p>
                  <p class="text-xs text-dimmed truncate">
                    {{ upload.path }}
                  </p>
                </div>
                <CopyButton :content="upload.path" />
              </li>
            </ul>
          </div>

          <div v-if="failedUploads.length > 0">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              {{ $t('studio.media.upload.failedSection', failedUploads.length) }}
            </h4>
            <ul
              class="max-h-56 overflow-auto divide-y divide-default rounded-md border border-default"
              aria-label="Failed uploads"
            >
              <li
                v-for="(upload, index) in failedUploads"
                :key="`failed-${upload.path}-${index}`"
                class="px-3 py-2 flex items-start gap-2"
              >
                <UIcon
                  name="i-lucide-circle-alert"
                  class="size-4 text-error shrink-0 mt-0.5"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-default truncate">
                    {{ upload.name }}
                  </p>
                  <p class="text-xs text-dimmed truncate">
                    {{ upload.path }}
                  </p>
                  <p class="text-xs text-error truncate">
                    {{ upload.reason }}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
