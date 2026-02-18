import type { H3Event } from 'h3'
import { createError, eventHandler, getRequestHeader, readRawBody, setResponseHeader } from 'h3'
import type { Storage, StorageMeta } from 'unstorage'
import { withLeadingSlash } from 'ufo'
// @ts-expect-error useStorage is not defined in .nuxt/imports.d.ts
import { useStorage } from '#imports'

export default eventHandler(async (event) => {
  const path = decodeURIComponent(event.path.replace('/__nuxt_studio/dev/public/', '')).replace(/^\/+/, '')
  const key = normalizeStorageKey(path)
  const storage = useStorage('nuxt_studio_public_assets') as Storage

  // GET/HEAD => getItem / getKeys / getMeta
  if (event.method === 'GET' || event.method === 'HEAD') {
    const isBaseKey = path === ':' || path.endsWith('/:')
    if (isBaseKey) {
      const baseKey = normalizeBaseKey(path)
      const keys = await storage.getKeys(baseKey)
      const normalizedKeys = keys
        .map(storageKey => normalizePathFromStorageKey(storageKey))
        .filter(Boolean)

      if (event.method === 'HEAD') {
        return 'OK'
      }

      return normalizedKeys
    }

    const item = await findItemMeta(storage, key)
    if (!item.meta) {
      throw createError({
        statusCode: 404,
        statusMessage: 'KV value not found',
      })
    }

    setMetaHeaders(event, item.meta)

    if (event.method === 'HEAD') {
      return 'OK'
    }

    const normalizedPath = normalizePathFromStorageKey(item.key)
    return {
      id: `public-assets/${normalizedPath}`,
      extension: normalizedPath.split('.').pop(),
      stem: normalizedPath.split('.').join('.'),
      path: withLeadingSlash(normalizedPath),
      fsPath: withLeadingSlash(normalizedPath),
      version: new Date(item.meta.mtime || new Date()).getTime(),
    }
  }

  if (event.method === 'PUT') {
    if (getRequestHeader(event, 'content-type') === 'application/octet-stream') {
      const value = await readRawBody(event, false)
      await storage.setItemRaw(key, value)
    }
    else if (getRequestHeader(event, 'content-type') === 'text/plain') {
      const value = await readRawBody(event, 'utf8')
      await storage.setItem(key, value!)
    }
    else {
      const value = await readRawBody(event, 'utf8')
      const json = JSON.parse(value || '{}')

      const data = json.raw.split(';base64,')[1]
      await storage.setItemRaw(key, Buffer.from(data, 'base64'))
    }

    return 'OK'
  }

  // DELETE => removeItem
  if (event.method === 'DELETE') {
    await removeItemVariants(storage, key)
    return 'OK'
  }
})

function normalizeStorageKey(path: string) {
  return path
    .replace(/^public-assets\/?/, '')
    .replace(/^public-assets:?/, '')
    .replace(/^\/+/, '')
}

function normalizeBaseKey(path: string) {
  return normalizeStorageKey(path)
    .replace(/\/:$/, '/')
    .replace(/:$/, '')
}

function normalizePathFromStorageKey(key: string) {
  return normalizeStorageKey(key).replace(/:/g, '/')
}

function getStorageKeyVariants(key: string) {
  const normalized = normalizeStorageKey(key)
  return Array.from(new Set([
    normalized,
    normalized.replace(/:/g, '/'),
    normalized.replace(/\//g, ':'),
  ])).filter(Boolean)
}

async function findItemMeta(storage: Storage, key: string) {
  const variants = getStorageKeyVariants(key)

  for (const candidate of variants) {
    const meta = await storage.getMeta(candidate)
    if (meta) {
      return {
        key: candidate,
        meta,
      }
    }
  }

  return {
    key: variants[0] || normalizeStorageKey(key),
    meta: null as StorageMeta | null,
  }
}

async function removeItemVariants(storage: Storage, key: string) {
  const variants = getStorageKeyVariants(key)
  await Promise.all(variants.map(variant => storage.removeItem(variant)))
}

function setMetaHeaders(event: H3Event, meta: StorageMeta) {
  if (meta.mtime) {
    setResponseHeader(
      event,
      'last-modified',
      new Date(meta.mtime).toUTCString(),
    )
  }
  if (meta.ttl) {
    setResponseHeader(event, 'x-ttl', `${meta.ttl}`)
    setResponseHeader(event, 'cache-control', `max-age=${meta.ttl}`)
  }
}
