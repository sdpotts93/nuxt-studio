import { defineEventHandler, createError, useRuntimeConfig } from "h3";
import { useSession } from "h3";
export default defineEventHandler(async (event) => {
  const path = event.path;
  if (!path.startsWith("/_studio") && !path.startsWith("/__nuxt_studio")) {
    return;
  }
  if (path.includes("/auth/")) {
    return;
  }
  const config = useRuntimeConfig(event);
  const allowedUsersConfig = config.studio?.allowedUsers;
  if (!allowedUsersConfig) {
    return;
  }
  const allowedUsers = allowedUsersConfig.split(",").map((u) => u.trim().toLowerCase()).filter(Boolean);
  if (allowedUsers.length === 0) {
    return;
  }
  const sessionSecret = config.studio?.auth?.sessionSecret;
  if (!sessionSecret) {
    return;
  }
  const session = await useSession(event, {
    name: "studio-session",
    password: sessionSecret
  });
  const user = session.data?.user;
  if (!user) {
    return;
  }
  const userIdentifiers = [
    user.email,
    user.login,
    user.name,
    user.providerId,
    user.username
  ].filter(Boolean).map((id) => String(id).toLowerCase());
  const isAllowed = allowedUsers.some(
    (allowed) => userIdentifiers.includes(allowed)
  );
  if (!isAllowed) {
    console.log(`[Studio] Access denied. User identifiers: ${userIdentifiers.join(", ")}. Allowed: ${allowedUsers.join(", ")}`);
    await session.clear();
    throw createError({
      statusCode: 403,
      statusMessage: "Access Denied",
      message: "You are not authorized to access Studio. Contact the administrator."
    });
  }
});
