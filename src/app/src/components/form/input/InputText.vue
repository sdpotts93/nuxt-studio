<script setup lang="ts">
import type { FormItem, TreeItem } from '../../../types'
import type { PropType } from 'vue'
import { computed, ref, onMounted, watch } from 'vue'
import InputMedia from './InputMedia.vue'
import InputColor from './InputColor.vue'
import { useStudio } from '../../../composables/useStudio'
import { shouldIgnoreMediaField } from '../../../utils/formMediaHeuristics'
import { isColorLikeField } from '../../../utils/formColorHeuristics'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel<string | number>({ default: '' })

const isMediaPickerOpen = ref(false)

const { documentTree } = useStudio()

const hasOptions = computed(() => props.formItem?.options && props.formItem.options.length > 0)

const selectItems = computed(() => {
  if (!props.formItem?.options) return []
  return props.formItem.options
    .filter(option => option !== '')
    .map(option => ({
      label: option,
      value: option,
    }))
})

// Keywords that suggest the field expects a media path
const imageKeywords = ['image', 'img', 'src', 'cover', 'thumbnail', 'avatar', 'photo', 'picture', 'banner', 'logo', 'poster']
const videoKeywords = ['video']
const videoPosterKeywords = ['poster', 'thumbnail', 'preview', 'cover', 'image', 'img']
// Keywords that suggest the field expects an icon
const iconKeywords = ['icon']

const mediaType = computed(() => {
  if (props.formItem?.type === 'video') return 'video'
  if (props.formItem?.type === 'media') return 'image'

  const id = props.formItem?.id?.split('/').pop()?.toLowerCase() || ''
  const key = props.formItem?.key?.toLowerCase() || ''
  const title = props.formItem?.title?.toLowerCase() || ''
  const name = `${id} ${key} ${title}`

  if (shouldIgnoreMediaField({ key, title, id })) {
    return null
  }

  const hasVideo = videoKeywords.some(keyword => name.includes(keyword))
  if (hasVideo) {
    const hasPoster = videoPosterKeywords.some(keyword => name.includes(keyword))
    return hasPoster ? 'image' : 'video'
  }

  return imageKeywords.some(keyword => name.includes(keyword)) ? 'image' : null
})

const useSearchableMedia = computed(() => mediaType.value === 'image')

const mediaIcon = computed(() => {
  return mediaType.value === 'video' ? 'i-lucide-video' : 'i-lucide-image'
})

const useColorInput = computed(() => {
  return isColorLikeField({ key: props.formItem?.key, title: props.formItem?.title, id: props.formItem?.id })
})

type LinkType = 'section' | 'route' | 'external'

const linkTypeItems = [
  { label: 'Section', value: 'section' },
  { label: 'Page', value: 'route' },
  { label: 'External', value: 'external' },
]

const linkKeywords = ['link', 'url', 'href']
const isLinkProp = computed(() => {
  const id = props.formItem?.id?.toLowerCase() || ''
  const key = props.formItem?.key?.toLowerCase() || ''
  const title = props.formItem?.title?.toLowerCase() || ''
  const name = `${id} ${key} ${title}`
  return linkKeywords.some(keyword => name.includes(keyword))
})

function isExternalLink(value: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(value)
}

function detectLinkType(value: string): LinkType {
  const trimmed = value.trim()
  if (!trimmed) return 'route'
  if (trimmed.startsWith('#')) return 'section'
  if (isExternalLink(trimmed)) return 'external'
  return 'route'
}

function normalizeLinkValue(type: LinkType, value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (type === 'section') {
    if (trimmed.startsWith('#')) return trimmed
    return `#${trimmed.replace(/^\/+/, '')}`
  }

  if (type === 'external') {
    return isExternalLink(trimmed) ? trimmed : ''
  }

  return trimmed.startsWith('#') || isExternalLink(trimmed) ? '' : trimmed
}

const linkType = ref<LinkType>('route')

function syncLinkTypeFromValue(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return
  const detected = detectLinkType(text)
  if (detected !== linkType.value) {
    linkType.value = detected
  }
}

const inputIdBase = computed(() => {
  const raw = props.formItem?.id || props.formItem?.key || props.formItem?.title || 'link'
  return `link-${String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
})
const sectionListId = computed(() => `${inputIdBase.value}-sections`)
const routeListId = computed(() => `${inputIdBase.value}-routes`)

const sectionIds = ref<string[]>([])

function refreshSectionIds() {
  if (!import.meta.client) return
  const ids = new Set<string>()
  const elements = document.querySelectorAll<HTMLElement>('section[id], [data-section-id]')
  elements.forEach((el) => {
    const sectionId = el.getAttribute('data-section-id') || el.id
    if (sectionId) {
      ids.add(sectionId)
    }
  })
  sectionIds.value = Array.from(ids).sort((a, b) => a.localeCompare(b))
}

function getRouteOptions(items: TreeItem[]): string[] {
  const routes = new Set<string>()
  const walk = (nodes: TreeItem[]) => {
    for (const item of nodes) {
      if (item.routePath) routes.add(item.routePath)
      if (item.children?.length) walk(item.children)
    }
  }

  walk(items)
  return Array.from(routes).sort((a, b) => a.localeCompare(b))
}

const routeOptions = computed(() => {
  return getRouteOptions(documentTree.root.value || [])
})

onMounted(() => {
  linkType.value = detectLinkType(String(model.value ?? ''))
  if (linkType.value === 'section') refreshSectionIds()
})

watch(() => model.value, (value) => {
  syncLinkTypeFromValue(value)
})

watch(() => linkType.value, (value) => {
  const current = String(model.value ?? '')
  if (current) {
    const normalized = normalizeLinkValue(value, current)
    if (normalized !== current) {
      model.value = normalized
    }
  }
  if (value === 'section') refreshSectionIds()
})

function ensureSectionPrefix() {
  if (linkType.value !== 'section') return
  const value = String(model.value ?? '').trim()
  if (!value) return
  if (!value.startsWith('#')) {
    model.value = `#${value.replace(/^\/+/, '')}`
  }
}

const isIconProp = computed(() => {
  const id = props.formItem?.id?.toLowerCase() || ''
  const key = props.formItem?.key?.toLowerCase() || ''
  const title = props.formItem?.title?.toLowerCase() || ''

  return iconKeywords.some(keyword =>
    id.includes(keyword) || key.includes(keyword) || title.includes(keyword),
  )
})

function handleMediaSelect(media: TreeItem) {
  model.value = media.routePath || media.fsPath
  isMediaPickerOpen.value = false
}

function handleMediaCancel() {
  isMediaPickerOpen.value = false
}
</script>

<template>
  <!-- Select for options -->
  <USelect
    v-if="hasOptions"
    v-model="(model as string)"
    :items="selectItems"
    :placeholder="$t('studio.form.text.selectPlaceholder')"
    size="xs"
    class="w-full"
  />

  <!-- Icon input -->
  <InputIcon
    v-else-if="isIconProp"
    v-model="(model as string)"
    :form-item="formItem"
    class="w-full"
  />

  <!-- Text input with optional media picker -->
  <template v-else>
    <div
      v-if="isLinkProp"
      class="flex items-center gap-2 w-full"
    >
      <USelect
        v-model="linkType"
        :items="linkTypeItems"
        size="xs"
        class="w-28 shrink-0"
      />
      <UInput
        v-if="linkType === 'section'"
        v-model="model"
        :placeholder="'#section-id'"
        size="xs"
        class="flex-1"
        :list="sectionListId"
        @blur="ensureSectionPrefix"
      />
      <UInput
        v-else-if="linkType === 'external'"
        v-model="model"
        type="url"
        :placeholder="'https://example.com'"
        size="xs"
        class="flex-1"
      />
      <UInput
        v-else
        v-model="model"
        :placeholder="'/route'"
        size="xs"
        class="flex-1"
        :list="routeListId"
      />
      <datalist :id="sectionListId">
        <option
          v-for="id in sectionIds"
          :key="id"
          :value="`#${id}`"
        />
      </datalist>
      <datalist :id="routeListId">
        <option
          v-for="route in routeOptions"
          :key="route"
          :value="route"
        />
      </datalist>
    </div>
    <InputColor
      v-else-if="useColorInput"
      v-model="(model as string)"
      class="w-full"
    />
    <InputMedia
      v-else-if="useSearchableMedia"
      v-model="(model as string)"
      :form-item="formItem"
      class="w-full"
    />
    <UInput
      v-else
      v-model="model"
      :placeholder="$t('studio.form.text.placeholder')"
      size="xs"
      class="w-full"
    >
      <template
        v-if="mediaType"
        #trailing
      >
        <UTooltip :text="mediaType === 'video' ? $t('studio.mediaPicker.video.title') : $t('studio.mediaPicker.image.title')">
          <UButton
            size="xs"
            color="neutral"
            variant="none"
            :icon="mediaIcon"
            class="cursor-pointer opacity-50 hover:opacity-100"
            @click="isMediaPickerOpen = true"
          />
        </UTooltip>
      </template>
    </UInput>

    <ModalMediaPicker
      v-if="mediaType && !useSearchableMedia"
      :open="isMediaPickerOpen"
      :type="mediaType"
      @select="handleMediaSelect"
      @cancel="handleMediaCancel"
    />
  </template>
</template>
