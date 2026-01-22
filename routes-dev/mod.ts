import { decodeBase64 } from "@std/encoding"
import { serveDir } from "@std/http"
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

  app.get("/dev-config-api/config/line_dashboard/:id", ({ json, params }) => {
    if (requestCount.config++ % 2 === 0) {
      return json(false)
    }
    return json({
      title: `dev title (${params.id})`,
      targetCycleTime: 30,
      targetEfficiency: 1,
    })
  })

  app.get("/dev-compute-api/timeline/:id", () => {
    if (requestCount.timeline++ % 2 === 0) {
      return new Response(new Uint8Array([0x90]))
    }

    const dataUrlPrefix = "data:application/octet-stream;base64,"
    const base64Data = timelineData.slice(dataUrlPrefix.length)
    const data = decodeBase64(base64Data)

    return new Response(data)
  })
}
