// deno-lint-ignore-file no-console

import { faker } from "@faker-js/faker"

import type { MachineDataValues } from "@/routes/line-dashboard/(_islands)/MachineDataLink.tsx"

interface Reply {
  id: number
  connect?: object
  subscribe?: object
}

interface PubData {
  val: MachineDataValues
  ts: {
    [K in keyof MachineDataValues]: string
  }
}

const publishedData: PubData = {
  val: {
    goodParts: 0,
    scrapParts: 0,
    averageCycleTime: 0,
    campChange: false,
    cycle: false,
    cycleTimeOver: false,
    fault: false,
    heartbeat: false,
    partRef: "",
  },
  ts: {
    goodParts: "",
    scrapParts: "",
    averageCycleTime: "",
    campChange: "",
    cycle: "",
    cycleTimeOver: "",
    fault: "",
    heartbeat: "",
    partRef: "",
  },
}

type Keys = keyof MachineDataValues

const valGenerators = {
  goodParts: () => faker.number.int({ min: 0, max: 1000 }),
  scrapParts: () => faker.number.int({ min: 0, max: 5 }),
  averageCycleTime: () => faker.number.int({ min: 280, max: 350 }),
  campChange: () => faker.datatype.boolean(),
  cycle: () => faker.datatype.boolean(),
  cycleTimeOver: () => faker.datatype.boolean(),
  fault: () => faker.datatype.boolean(),
  heartbeat: () => !publishedData.val.heartbeat,
  partRef: () => faker.science.chemicalElement().name,
} satisfies { [K in Keys]: () => typeof publishedData.val[K] }

function updatePublished() {
  for (const key of Object.keys(publishedData.val) as Array<Keys>) {
    if (faker.datatype.boolean(0.3)) {
      Object.assign(publishedData.val, { [key]: valGenerators[key]() })
      Object.assign(publishedData.ts, { [key]: faker.date.recent().toISOString() })
    }
  }
}

function setupPublish(ws: WebSocket, channel: string): number {
  return +setInterval(() => {
    updatePublished()
    ws.send(JSON.stringify({
      id: 0,
      push: {
        channel,
        pub: {
          data: publishedData,
        },
      },
    }))
  }, 5000)
}

function setupWebSocket(ws: WebSocket) {
  let publishIntervalHandler: number

  ws.addEventListener("message", ({ data }) => {
    if (typeof data !== "string") {
      return
    }

    const replies = []

    for (const rawReq of data.split("\n")) {
      const req = JSON.parse(rawReq)

      if (req && typeof req === "object" && !Array.isArray(req)) {
        const reply: Reply = { id: req.id }

        if (req.connect != null) {
          reply.connect = {}
        }
        if (req.subscribe != null) {
          reply.subscribe = {}
          publishIntervalHandler = setupPublish(ws, req.subscribe.channel)
        }

        replies.push(reply)
      }
    }

    ws.send(replies.map((reply) => JSON.stringify(reply)).join("\n"))
  })

  ws.addEventListener("close", () => {
    clearTimeout(publishIntervalHandler)
  })
}

export default {
  fetch(req, info) {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response(null, { status: 426 })
    }

    if (info.remoteAddr.transport === "tcp") {
      const { hostname, port } = info.remoteAddr
      console.log(`Centrifugo Mock Server got a request from ${hostname}:${port}`)
    }

    const { socket, response } = Deno.upgradeWebSocket(req)

    setupWebSocket(socket)

    return response
  },

  onListen(addr) {
    if (addr.transport === "tcp") {
      console.log(`Centrifugo Mock Server started on ${addr.hostname}:${addr.port}`)
    }
  },
} satisfies Deno.ServeDefaultExport
