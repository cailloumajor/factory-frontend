// deno-fmt-ignore
const timelineData = [
  0x95, 0x92, 0xce, 0x1c, 0x18, 0xf8, 0x00, 0x00, 0x92, 0xce, 0x1c, 0x19, 0x4c,
  0x60, 0x01, 0x92, 0xce, 0x1c, 0x19, 0x92, 0xb0, 0xc0, 0x92, 0xce, 0x1c, 0x19,
  0xa0, 0xc0, 0x02, 0x92, 0xce, 0x1c, 0x19, 0xf5, 0x20, 0x03,
]

const upRoute = new URLPattern({ pathname: "/up" })
const configRoute = new URLPattern({ pathname: "/dashboard-config/:id" })
const performanceRoute = new URLPattern({ pathname: "/performance/:id" })
const timelineRoute = new URLPattern({ pathname: "/timeline/:id" })

function router(url: URL): Response {
  if (upRoute.test(url)) {
    return new Response(null, { status: 204 })
  }

  const configRouteMatch = configRoute.exec(url)
  if (configRouteMatch) {
    return Response.json({
      title: configRouteMatch.pathname.groups.id,
      targetCycleTime: 54.78,
      targetEfficiency: 0.844,
    })
  }

  if (performanceRoute.test(url)) {
    return Response.json(84.225)
  }

  if (timelineRoute.test(url)) {
    return new Response(new Uint8Array(timelineData), {
      headers: {
        "Content-Type": "application/msgpack",
      },
    })
  }

  return new Response("not found", { status: 404 })
}

export default {
  fetch(req, info) {
    const reqURL = new URL(req.url)

    const resp = router(reqURL)

    const remoteHost = info.remoteAddr.transport === "tcp" ? info.remoteAddr.hostname : ""
    // deno-lint-ignore no-console -- console is used by purpose
    console.log(remoteHost, "-", req.method, reqURL.pathname, resp.status)

    return resp
  },
} satisfies Deno.ServeDefaultExport
