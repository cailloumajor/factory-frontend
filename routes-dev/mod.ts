import { faker } from "@faker-js/faker"
import type { App } from "fresh"

import type { State } from "@/utils/state.ts"

import timelineData from "./timeline_data.bin?url&inline"

export function devRoutes(app: App<State>) {
  app.get("/dev-dashboard-config/:id", ({ json, params }) => {
    if (faker.datatype.boolean(0.4)) {
      return json(false)
    }
    return json({
      title: `Factory Frontend development (${params.id})`,
      targetCycleTime: 30,
      targetEfficiency: 0.78,
    })
  })

  app.get("/dev-timeline/:id", () => {
    if (faker.datatype.boolean(0.4)) {
      return new Response(new Uint8Array([0x90]))
    }

    const dataUrlPrefix = "data:application/octet-stream;base64,"
    const base64Data = timelineData.slice(dataUrlPrefix.length)
    const data = Uint8Array.fromBase64(base64Data)

    return new Response(data)
  })

  app.get("/dev-performance/:id", () => {
    if (faker.datatype.boolean(0.4)) {
      return new Response(null, { status: 500 })
    }

    return Response.json(faker.number.float({ min: 70, max: 82 }))
  })
}
