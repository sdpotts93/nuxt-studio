export const MEDIA_IGNORE_KEYWORDS = [
  'speed',
  'width',
  'radius',
  'button',
  'title',
  'text',
  'link',
]

export const IMAGE_KEYWORDS = [
  'image',
  'img',
  'photo',
  'background',
  'backgroundimage',
  'poster',
  'thumb',
  'thumbnail',
  'logo',
  'banner',
  'cover',
  'avatar',
  'picture',
]

function getLeafKey(key?: string, id?: string): string {
  if (key) return key.replace(/^:/, '')
  if (id) {
    const segments = id.split('/')
    return segments[segments.length - 1].replace(/^:/, '')
  }
  return ''
}

type MediaFieldOptions = {
  key?: string,
  title?: string,
  id?: string,
}

export function shouldIgnoreMediaField(options: MediaFieldOptions): boolean {
  const leaf = getLeafKey(options.key, options.id).toLowerCase()
  const title = (options.title || '').toLowerCase()

  return MEDIA_IGNORE_KEYWORDS.some(term => (
    (leaf && leaf.includes(term))
    || (title && title.includes(term))
  ))
}

export function isImageLikeField(options: MediaFieldOptions): boolean {
  if (shouldIgnoreMediaField(options)) return false

  const leaf = getLeafKey(options.key, options.id).toLowerCase()
  const title = (options.title || '').toLowerCase()
  const combined = [leaf, title].filter(Boolean).join('|')

  if (!combined) return false

  return IMAGE_KEYWORDS.some(term => combined.includes(term))
}
