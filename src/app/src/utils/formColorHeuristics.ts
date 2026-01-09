const COLOR_KEYWORDS = [
  'color',
  'colour',
]

function getLeafKey(key?: string, id?: string): string {
  if (key) return key.replace(/^:/, '')
  if (id) {
    const segments = id.split('/')
    return segments[segments.length - 1].replace(/^:/, '')
  }
  return ''
}

export function isColorLikeField(options: { key?: string; title?: string; id?: string }): boolean {
  const leaf = getLeafKey(options.key, options.id).toLowerCase()
  const title = (options.title || '').toLowerCase()
  const combined = [leaf, title].filter(Boolean).join('|')

  if (!combined) return false

  return COLOR_KEYWORDS.some(term => combined.includes(term))
}
