import { decodeBase64 } from "@std/encoding"
import { serveDir } from "@std/http"
import * as posix from "@std/path/posix"
import type { App } from "fresh"

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

  app.use((ctx) => {
    const configPath = posix.join(ctx.state.appConfig.apiBaseUrl.configApi, "line_dashboard", ":id")
    const pattern = new URLPattern({ pathname: configPath })
    const match = pattern.exec(ctx.url)
    if (match == null) {
      return ctx.next()
    }

    if (requestCount.config++ % 2 === 0) {
      return ctx.json(false)
    }
    return ctx.json({
      title: `dev title (${match.pathname.groups.id})`,
      targetCycleTime: 60,
      targetEfficiency: 1,
    })
  })

  app.use((ctx) => {
    const timelinePath = posix.join(ctx.state.appConfig.apiBaseUrl.computeApi, "timeline", ":id")
    const pattern = new URLPattern({ pathname: timelinePath })
    const match = pattern.exec(ctx.url)
    if (match == null) {
      return ctx.next()
    }

    if (requestCount.timeline++ % 2 === 0) {
      return new Response(new Uint8Array([0x90]))
    }

    const dataUrlPrefix = "data:application/octet-stream;base64,"
    const base64Data = timelineData.slice(dataUrlPrefix.length)
    const data = decodeBase64(base64Data)

    return new Response(data)
  })
}
