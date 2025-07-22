import * as posix from "@std/path/posix"
import type { App } from "fresh"

import { getAppConfig } from "../utils/config.ts"
import type { State } from "../utils/state.ts"

import timelineData from "./timeline_data.bin" with { type: "bytes" }

export function devRoutes(app: App<State>) {
  const appConfig = getAppConfig()

  app.get(
    posix.join(appConfig.apiBaseUrl.computeApi, "timeline", ":id"),
    (_ctx) => new Response(timelineData),
  )
}
