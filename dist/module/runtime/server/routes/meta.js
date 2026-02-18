import { eventHandler, useSession } from "h3";
import { useRuntimeConfig, createError } from "#imports";
import components from "#nuxt-component-meta/nitro";
import { highlight } from "#mdc-imports";
export default eventHandler(async (event) => {
  const config = useRuntimeConfig();
  if (!import.meta.dev) {
    const session = await useSession(event, {
      name: "studio-session",
      password: config.studio?.auth?.sessionSecret
    });
    if (!session?.data?.user) {
      throw createError({
        statusCode: 404,
        message: "Not found"
      });
    }
  }
  const mappedComponents = Object.values(components).map(({ pascalName, filePath, meta }) => {
    return {
      name: pascalName,
      path: filePath,
      meta: {
        props: meta.props,
        slots: meta.slots,
        events: meta.events
      }
    };
  });
  return {
    markdownConfig: config.studio.markdown || {},
    highlightTheme: highlight?.theme || { default: "github-light", dark: "github-dark", light: "github-light" },
    components: mappedComponents
  };
});
