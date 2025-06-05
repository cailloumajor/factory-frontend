import { App, fsRoutes, staticFiles } from "fresh"

import { i18n } from "./i18n.ts"
import type { State } from "./utils.ts"

export const app = new App<State>()
  .use(async (ctx) => {
    if (ctx.config.mode === "development") {
      const resp = await ctx.next()
      // deno-lint-ignore no-console -- console is used by purpose.
      console.log(`${ctx.req.method} ${ctx.req.url} ${resp.status}`)
      return resp
    }
    return ctx.next()
  })
  .use(staticFiles())
  .use(await i18n())

await fsRoutes(app, {
  loadIsland: (path) => import(`./islands/${path}`),
  loadRoute: (path) => import(`./routes/${path}`),
})

if (import.meta.main) {
  await app.listen()
}
