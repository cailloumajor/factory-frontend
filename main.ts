import { App, staticFiles } from "fresh"

import { devRoutes } from "./routes-dev/index.ts"
import { i18n } from "./utils/i18n.ts"
import type { State } from "./utils/state.ts"
import { appConfig } from "./utils/config.ts"

export const app = new App<State>()
  .use(appConfig())
  .use(staticFiles())
  .use(await i18n())
  .fsRoutes()

if (import.meta.env.MODE === "development") {
  devRoutes(app)
}
