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
declare const _default: import("h3").EventHandler<import("h3").EventHandlerRequest, Promise<void>>;
export default _default;
