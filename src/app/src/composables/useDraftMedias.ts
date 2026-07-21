import { joinURL, withLeadingSlash } from 'ufo'
import type { DraftItem, StudioHost, MediaItem, RawFile } from '../types'
import { VirtualMediaCollectionName, generateStemFromFsPath } from '../utils/media'
import { DraftStatus } from '../types/draft'
import type { useGitProvider } from './useGitProvider'
import { createSharedComposable } from '@vueuse/core'
import { useDraftBase } from './useDraftBase'
import { mediaStorage as storage } from '../utils/storage'
import { getFileExtension, slugifyFileName } from '../utils/file'
import { useHooks } from './useHooks'

const hooks = useHooks()

export const useDraftMedias = createSharedComposable((host: StudioHost, gitProvider: ReturnType<typeof useGitProvider>) => {
  const {
    isLoading,
    list,
    current,
    get,
    create,
    remove,
    revert,
    revertAll,
    selectByFsPath,
    unselect,
    load,
    getStatus,
  } = useDraftBase('media', host, gitProvider, storage)

  async function upload(parentFsPath: string, file: File) {
    const draftItem = await fileToDraftItem(parentFsPath, file)
    host.media.upsert(draftItem.fsPath, draftItem.modified!)
    await create(draftItem.fsPath, draftItem.modified!)
  }

  async function fileToDraftItem(parentFsPath: string, file: File): Promise<DraftItem<MediaItem>> {
    const rawData = await fileToDataUrl(file)
    const slugifiedFileName = slugifyFileName(file.name)
    const fsPath = parentFsPath !== '/' ? joinURL(parentFsPath, slugifiedFileName) : slugifiedFileName

    return {
      fsPath,
      remoteFile: undefined,
      status: DraftStatus.Created,
      modified: {
        id: joinURL(VirtualMediaCollectionName, fsPath),
        fsPath,
        extension: getFileExtension(fsPath),
        stem: generateStemFromFsPath(fsPath),
        path: withLeadingSlash(fsPath),
        raw: rawData,
      },
    }
  }

  async function rename(items: { fsPath: string, newFsPath: string }[]) {
    for (const item of items) {
      const { fsPath, newFsPath } = item

      const existingDraftToRename = list.value.find(draftItem => draftItem.fsPath === fsPath) as DraftItem<MediaItem>

      const currentDbItem = await host.media.get(fsPath)
      const modifiedItem = existingDraftToRename?.modified || currentDbItem
      if (!modifiedItem) {
        throw new Error(`Database item not found for media fsPath: ${fsPath}`)
      }

      // Existing media records only contain metadata. Preserve uploaded bytes or
      // fetch the original file before moving it so the new Git path can be created.
      let raw = modifiedItem.raw
      if (typeof raw !== 'string') {
        const remoteFile = existingDraftToRename?.remoteFile
          || await gitProvider.api.fetchFile(joinURL('public', fsPath), { cached: true })
        raw = remoteFile?.content
      }

      await remove([fsPath], { rerender: false })

      const newDbItem: MediaItem = {
        ...modifiedItem,
        fsPath: newFsPath,
        id: joinURL(VirtualMediaCollectionName, newFsPath),
        stem: generateStemFromFsPath(newFsPath),
        path: withLeadingSlash(newFsPath),
        ...(typeof raw === 'string' ? { raw } : {}),
      }

      await host.media.upsert(newFsPath, newDbItem)

      let originalDbItem: MediaItem | undefined = currentDbItem
      if (existingDraftToRename) {
        originalDbItem = existingDraftToRename.original
      }

      await create(newFsPath, newDbItem, originalDbItem, { rerender: false })
    }

    await hooks.callHook('studio:draft:media:updated', { caller: 'useDraftMedias.rename' })
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  async function listAsRawFiles(): Promise<RawFile[]> {
    const files = [] as RawFile[]
    for (const draftItem of list.value) {
      if (draftItem.status === DraftStatus.Pristine) {
        continue
      }

      if (draftItem.status === DraftStatus.Deleted) {
        files.push({ path: joinURL('public', draftItem.fsPath), content: null, status: draftItem.status, encoding: 'base64' })
        continue
      }

      let raw = draftItem.modified?.raw

      // Recover drafts created by older Studio versions when a media folder was
      // renamed without copying the binary content into the new draft entry.
      if (typeof raw !== 'string' && draftItem.original?.fsPath) {
        const remoteFile = await gitProvider.api.fetchFile(joinURL('public', draftItem.original.fsPath), { cached: true })
        raw = remoteFile?.content
      }

      if (typeof raw !== 'string') {
        throw new TypeError(`Cannot publish media "${draftItem.fsPath}": its file content is unavailable. Re-upload the image and try again.`)
      }

      const content = raw.replace(/^data:[^;]+;base64,/, '')
      files.push({ path: joinURL('public', draftItem.fsPath), content, status: draftItem.status, encoding: 'base64' })
    }

    return files
  }

  return {
    isLoading,
    list,
    current,
    get,
    create,
    update: () => {},
    duplicate: () => {},
    remove,
    revert,
    revertAll,
    rename,
    load,
    selectByFsPath,
    unselect,
    upload,
    listAsRawFiles,
    getStatus,
  }
})
