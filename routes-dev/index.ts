import * as posix from "@std/path/posix"
import type { App } from "fresh"

import { getAppConfig } from "../utils/config.ts"
import type { State } from "../utils/state.ts"

import timelineDataPath from "./timeline_data.bin?url"

export function devRoutes(app: App<State>) {
  const requestCount = {
    config: 0,
    timeline: 0,
  }

  const { apiBaseUrl } = getAppConfig()

  const configUrl = posix.join(apiBaseUrl.configApi, "line_dashboard", ":id")
  const timelineUrl = posix.join(apiBaseUrl.computeApi, "timeline", ":id")

  app.get(configUrl, ({ params }) => {
    requestCount.config += 1
    if (requestCount.config % 2 === 0) {
      return Response.json(false)
    }
    return Response.json({
      title: `dev title (${params.id})`,
      targetCycleTime: 60,
      targetEfficiency: 1,
    })
  })

  app.get(timelineUrl, async ({ url }) => {
    requestCount.timeline += 1
    if (requestCount.timeline % 2 === 0) {
      return new Response(null, { status: 403 })
    }
    const timelineDataUrl = new URL(url)
    timelineDataUrl.pathname = timelineDataPath
    const timelineData = await fetch(timelineDataUrl).then((resp) => resp.arrayBuffer())
    return new Response(timelineData)
  })
}
