import { defineEventHandler, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

interface GitHubAppConfig {
  appId?: string
  privateKey?: string
  installationId?: string
}

interface InstallationTokenResponse {
  token: string
  expires_at: string
}

/**
 * Generate a GitHub App installation token for bot-attributed commits.
 * This endpoint is called by the Studio app when making commits.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const githubApp = config.studio?.githubApp as GitHubAppConfig | undefined

  const appId = githubApp?.appId
  const installationId = githubApp?.installationId
  let privateKey = githubApp?.privateKey || ''

  // Check if GitHub App is configured
  if (!appId || !privateKey || !installationId) {
    throw createError({
      statusCode: 404,
      message: 'GitHub App not configured',
    })
  }

  // Support base64-encoded private key
  if (privateKey && !privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8')
    }
    catch {
      // Not valid base64, try using as-is
    }
  }
  privateKey = privateKey.replace(/\\n/g, '\n')

  try {
    // Generate JWT for GitHub App authentication
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iat: now - 60, // Issued 60 seconds ago to account for clock drift
      exp: now + 600, // Expires in 10 minutes
      iss: appId,
    }

    // Create JWT header and payload
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signatureInput = `${header}.${body}`

    // Sign with private key using Node.js crypto
    const crypto = await import('node:crypto')
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(signatureInput)
    const signature = sign.sign(privateKey, 'base64url')

    const jwt = `${signatureInput}.${signature}`

    // Exchange JWT for installation access token
    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'nuxt-studio',
        },
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw createError({
        statusCode: 500,
        message: `Failed to generate GitHub App token: ${error}`,
      })
    }

    const data = await response.json() as InstallationTokenResponse

    return {
      token: data.token,
      expiresAt: data.expires_at,
    }
  }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: `Failed to generate GitHub App token: ${(error as Error).message}`,
    })
  }
})
