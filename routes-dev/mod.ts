import { decodeBase64 } from "@std/encoding"
import type { App } from "fresh"

import type { State } from "@/utils/state.ts"

import timelineData from "./timeline_data.bin?url&inline"
import { faker } from "@faker-js/faker"

export function devRoutes(app: App<State>) {
  app.get("/dev-config-api/config/line_dashboard/:id", ({ json, params }) => {
    if (faker.datatype.boolean(0.4)) {
      return json(false)
    }
    return json({
      title: `Factory Frontend development (${params.id})`,
      targetCycleTime: 30,
      targetEfficiency: 0.78,
    })
  })

  app.get("/dev-compute-api/timeline/:id", () => {
    if (faker.datatype.boolean(0.4)) {
      return new Response(new Uint8Array([0x90]))
    }

    const dataUrlPrefix = "data:application/octet-stream;base64,"
    const base64Data = timelineData.slice(dataUrlPrefix.length)
    const data = decodeBase64(base64Data)

    return new Response(data)
  })

  app.get("/dev-compute-api/performance/:id", () => {
    if (faker.datatype.boolean(0.4)) {
      return new Response(null, { status: 500 })
    }

    return Response.json(faker.number.float({ min: 70, max: 82 }))
  })
}
