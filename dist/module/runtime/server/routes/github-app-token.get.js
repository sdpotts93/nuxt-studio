import { defineEventHandler, createError, useRuntimeConfig } from "h3";
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const githubApp = config.studio?.githubApp;
  const appId = githubApp?.appId;
  const installationId = githubApp?.installationId;
  let privateKey = githubApp?.privateKey || "";
  if (!appId || !privateKey || !installationId) {
    throw createError({
      statusCode: 404,
      message: "GitHub App not configured"
    });
  }
  if (privateKey && !privateKey.includes("-----BEGIN")) {
    try {
      privateKey = Buffer.from(privateKey, "base64").toString("utf-8");
    } catch {
    }
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
  try {
    const now = Math.floor(Date.now() / 1e3);
    const payload = {
      iat: now - 60,
      // Issued 60 seconds ago to account for clock drift
      exp: now + 600,
      // Expires in 10 minutes
      iss: appId
    };
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signatureInput = `${header}.${body}`;
    const crypto = await import("node:crypto");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signatureInput);
    const signature = sign.sign(privateKey, "base64url");
    const jwt = `${signatureInput}.${signature}`;
    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "nuxt-studio"
        }
      }
    );
    if (!response.ok) {
      const error = await response.text();
      throw createError({
        statusCode: 500,
        message: `Failed to generate GitHub App token: ${error}`
      });
    }
    const data = await response.json();
    return {
      token: data.token,
      expiresAt: data.expires_at
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: `Failed to generate GitHub App token: ${error.message}`
    });
  }
});
