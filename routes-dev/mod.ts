import { decodeBase64 } from "@std/encoding"
import { serveDir } from "@std/http"
import * as posix from "@std/path/posix"
import type { App } from "fresh"

import { getAppConfig } from "@/utils/config.ts"
import type { State } from "@/utils/state.ts"

import timelineData from "./timeline_data.bin?url&inline"

export function devRoutes(app: App<State>) {
  // TODO: remove this hack if https://github.com/denoland/fresh/issues/3424 gets fixed.
  app.get("/node_modules/.deno/@fontsource-variable*", ({ req }) => {
    return serveDir(req, { showDotfiles: true, quiet: true })
  })

  const requestCount = {
    config: 0,
    timeline: 0,
  }

  const { apiBaseUrl } = getAppConfig()

  const configUrl = posix.join(apiBaseUrl.configApi, "line_dashboard", ":id")
  const timelineUrl = posix.join(apiBaseUrl.computeApi, "timeline", ":id")

  app.get(configUrl, (ctx) => {
    if (requestCount.config++ % 2 === 0) {
      return ctx.json(false)
    }
    return ctx.json({
      title: `dev title (${ctx.params.id})`,
      targetCycleTime: 60,
      targetEfficiency: 1,
    })
  })

  app.get(timelineUrl, () => {
    if (requestCount.timeline++ % 2 === 0) {
      return new Response(new Uint8Array([0x90]))
    }

    const dataUrlPrefix = "data:application/octet-stream;base64,"
    const base64Data = timelineData.slice(dataUrlPrefix.length)
    const data = decodeBase64(base64Data)

    return new Response(data)
  })
}
