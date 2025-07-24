import { App, staticFiles } from "fresh"

import { i18n } from "./utils/i18n.ts"
import type { State } from "./utils/state.ts"
import { hostedFonts } from "./utils/style.ts"
import { appConfig } from "./utils/config.ts"

export const app = new App<State>()

app
  .use(appConfig())
  .use(async (ctx) => {
    if (ctx.config.mode === "development") {
      const resp = await ctx.next()
      // deno-lint-ignore no-console -- console is used by purpose.
      console.log(`${ctx.req.method} ${ctx.req.url} ${resp.status}`)
      return resp
    }
    return ctx.next()
  })
  .use(await hostedFonts(app.config.root))
  .use(staticFiles())
  .use(await i18n())
  .fsRoutes()
