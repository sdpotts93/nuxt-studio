/**
 * Generate a GitHub App installation token for bot-attributed commits.
 * This endpoint is called by the Studio app when making commits.
 */
declare const _default: import("h3").EventHandler<import("h3").EventHandlerRequest, Promise<{
    token: string;
    expiresAt: string;
}>>;
export default _default;
