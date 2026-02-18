import { createJiti } from "file:///Users/stevenpotts/git/nuxt-studio/node_modules/.pnpm/jiti@2.6.1/node_modules/jiti/lib/jiti.mjs";

const jiti = createJiti(import.meta.url, {
  "interopDefault": true,
  "alias": {
    "undefined": "/Users/stevenpotts/git/nuxt-studio/src/module"
  },
  "transformOptions": {
    "babel": {
      "plugins": []
    }
  }
})

/** @type {import("/Users/stevenpotts/git/nuxt-studio/src/module/src/module")} */
const _module = await jiti.import("/Users/stevenpotts/git/nuxt-studio/src/module/src/module.ts");

export default _module?.default ?? _module;