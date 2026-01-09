import { defineEventHandler, createError, useRuntimeConfig } from 'h3'
import { useSession } from 'h3'

interface StudioUser {
  email?: string
  login?: string
  name?: string
  providerId?: string
  username?: string
}

/**
 * Middleware to restrict Studio access to allowed users only.
 *
 * Configure via nuxt.config.ts:
 *   studio: {
 *     allowedUsers: 'user@email.com,github-username'
 *   }
 *
 * Or via environment variable:
 *   STUDIO_ALLOWED_USERS=user@email.com,github-username
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  // Only check Studio routes
  if (!path.startsWith('/_studio') && !path.startsWith('/__nuxt_studio')) {
    return
  }

  // Skip auth routes (login flow)
  if (path.includes('/auth/')) {
    return
  }

  const config = useRuntimeConfig(event)
  const allowedUsersConfig = config.studio?.allowedUsers as string | undefined

  if (!allowedUsersConfig) {
    // No allowlist configured - allow all authenticated users
    return
  }

  const allowedUsers = allowedUsersConfig
    .split(',')
    .map(u => u.trim().toLowerCase())
    .filter(Boolean)

  if (allowedUsers.length === 0) {
    return
  }

  // Check if user has a session
  const sessionSecret = config.studio?.auth?.sessionSecret as string | undefined
  if (!sessionSecret) {
    return
  }

  const session = await useSession(event, {
    name: 'studio-session',
    password: sessionSecret,
  })

  const user = session.data?.user as StudioUser | undefined

  if (!user) {
    // No session yet - let them through to authenticate
    return
  }

  // Check if user is in allowlist (by email, username, login, or providerId)
  const userIdentifiers = [
    user.email,
    user.login,
    user.name,
    user.providerId,
    user.username,
  ].filter(Boolean).map(id => String(id).toLowerCase())

  const isAllowed = allowedUsers.some(allowed =>
    userIdentifiers.includes(allowed),
  )

  if (!isAllowed) {
    console.log(`[Studio] Access denied. User identifiers: ${userIdentifiers.join(', ')}. Allowed: ${allowedUsers.join(', ')}`)

    // Clear their session so they can't keep trying
    await session.clear()

    throw createError({
      statusCode: 403,
      statusMessage: 'Access Denied',
      message: 'You are not authorized to access Studio. Contact the administrator.',
    })
  }
})
