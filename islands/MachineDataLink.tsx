import { mdiHelp, mdiLinkOff, mdiSwapHorizontal } from "@mdi/js"
import { type Signal, signal, useComputed, useSignal, useSignalEffect } from "@preact/signals"
import * as posix from "@std/path/posix"
import {
  Centrifuge,
  type PublicationContext,
  type SubscribedContext,
  type TransportEndpoint,
} from "centrifuge"
import clsx from "clsx"
import type { HTMLAttributes } from "preact"
import { useEffect } from "preact/hooks"

import { Icon } from "@/components/Icon.tsx"

export interface MachineDataValues {
  goodParts: number
  scrapParts: number
  averageCycleTime: number
  campChange: boolean
  cycle: boolean
  cycleTimeOver: boolean
  fault: boolean
  heartbeat: boolean
  partRef: string
}

interface MachineData {
  invalid: Signal<boolean>
  val: {
    [K in keyof MachineDataValues]: Signal<MachineDataValues[K]>
  }
  ts: {
    [K in keyof MachineDataValues]: Signal<string>
  }
}

type MachineDataValEntry = {
  [K in keyof MachineDataValues]: [K, MachineDataValues[K]]
}[keyof MachineDataValues]

type MachineDataTsEntry = {
  [K in keyof MachineDataValues]: [K, string]
}[keyof MachineDataValues]

export function createMachineData(): MachineData {
  return {
    invalid: signal(true),
    val: {
      goodParts: signal(0),
      scrapParts: signal(0),
      averageCycleTime: signal(0),
      campChange: signal(false),
      cycle: signal(false),
      cycleTimeOver: signal(false),
      fault: signal(false),
      heartbeat: signal(false),
      partRef: signal("?"),
    },
    ts: {
      goodParts: signal(""),
      scrapParts: signal(""),
      averageCycleTime: signal(""),
      campChange: signal(""),
      cycle: signal(""),
      cycleTimeOver: signal(""),
      fault: signal(""),
      heartbeat: signal(""),
      partRef: signal(""),
    },
  }
}

export enum LinkStatus {
  Unknown,
  Down,
  Up,
}

/** Utilities used by this module, exported to allow mocking for tests. */
export const moduleUtils = {
  newCentrifuge(...args: ConstructorParameters<typeof Centrifuge>) {
    return new Centrifuge(...args)
  },
}

function statusColor(status: LinkStatus) {
  return {
    [LinkStatus.Unknown]: "fill-warning",
    [LinkStatus.Down]: "fill-error",
    [LinkStatus.Up]: "fill-success",
  }[status]
}

function statusIcon(status: LinkStatus) {
  return {
    [LinkStatus.Unknown]: mdiHelp,
    [LinkStatus.Down]: mdiLinkOff,
    [LinkStatus.Up]: mdiSwapHorizontal,
  }[status]
}

function transportText(transport: string) {
  return {
    websocket: "(WS)",
    sse: "(SSE)",
  }[transport] ?? ""
}

function transportColor(transport: string) {
  return {
    websocket: "text-success",
    sse: "text-warning",
  }[transport] ?? ""
}

interface MachineDataLinkProps extends HTMLAttributes<HTMLSpanElement> {
  /** The base path of Centrifugo server endpoint. */
  centrifugoBasePath: string
  /** The Centrifugo namespace to issue subscription on. */
  centrifugoNamespace: string
  /** The ID of the monitored partner. */
  partnerId: string
  /** The machine data reactive object. */
  machineData: MachineData
  /** The timeout for PLC to change some data. */
  plcTimeoutMillis: number
  /** Whether debugging should be enabled. */
  debug: boolean
  /** The error text to be displayed, if any. */
  errorText: Signal<string>
}

/**
 * Manages the communication with real time machine data communication.
 *
 * Renders the statuses of the communication components.
 */
export function MachineDataLink(props: MachineDataLinkProps) {
  const centrifugoLinkStatus = useSignal(LinkStatus.Unknown)
  const plcRawStatus = useSignal(LinkStatus.Down)
  const plcShownStatus = useComputed(() =>
    centrifugoLinkStatus.value === LinkStatus.Up ? plcRawStatus.value : LinkStatus.Unknown
  )

  const centrifugoTransport = useSignal("")

  useSignalEffect(() => {
    props.machineData.invalid.value = !(
      centrifugoLinkStatus.value === LinkStatus.Up &&
      plcRawStatus.value === LinkStatus.Up
    )
  })

  let updateTimeoutHandle: number

  function patchMachineData({ data }: SubscribedContext | PublicationContext) {
    // Return if data is null, undefined or not an object.
    if (data == null || typeof data != "object") {
      return
    }

    let gotUpdate = false

    for (const entry of Object.entries(data.val ?? {})) {
      if (Object.prototype.hasOwnProperty.call(props.machineData.val, entry[0])) {
        const [key, val] = entry as MachineDataValEntry
        props.machineData.val[key].value = val
        gotUpdate = true
      }
    }
    for (const entry of Object.entries(data.ts ?? {})) {
      if (Object.prototype.hasOwnProperty.call(props.machineData.ts, entry[0])) {
        const [key, val] = entry as MachineDataTsEntry
        props.machineData.ts[key].value = val
      }
    }

    if (gotUpdate) {
      plcRawStatus.value = LinkStatus.Up
      clearTimeout(updateTimeoutHandle)
      updateTimeoutHandle = setTimeout(() => {
        plcRawStatus.value = LinkStatus.Down
      }, props.plcTimeoutMillis)
    }
  }

  useEffect(() => {
    const centrifugoHostPath = posix.join(location.host, props.centrifugoBasePath)
    const transports: TransportEndpoint[] = [
      {
        transport: "websocket",
        endpoint: `ws://${posix.join(centrifugoHostPath, "connection/websocket")}`,
      },
      {
        transport: "sse",
        endpoint: `http://${posix.join(centrifugoHostPath, "connection/sse")}`,
      },
    ]
    const centrifuge = moduleUtils.newCentrifuge(transports, {
      name: `Frontend (${props.partnerId})`,
      debug: props.debug,
      emulationEndpoint: `http://${posix.join(centrifugoHostPath, "emulation")}`,
      maxReconnectDelay: 5000,
    })

    centrifuge.on("connected", (ctx) => {
      props.errorText.value = ""
      centrifugoLinkStatus.value = LinkStatus.Up
      centrifugoTransport.value = ctx.transport
    })
    centrifuge.on("disconnected", (_ctx) => {
      centrifugoLinkStatus.value = LinkStatus.Down
      centrifugoTransport.value = ""
    })
    centrifuge.on("error", (ctx) => {
      centrifugoLinkStatus.value = LinkStatus.Down
      centrifugoTransport.value = ""
      props.errorText.value = `Centrifuge error (${ctx.type}): ${ctx.error.message}`
    })

    const opcDataChangeSubscription = centrifuge.newSubscription(
      `${props.centrifugoNamespace}:${props.partnerId}`,
    )
    opcDataChangeSubscription.on("subscribed", (ctx) => {
      props.errorText.value = ""
      patchMachineData(ctx)
    })
    opcDataChangeSubscription.on("error", (ctx) => {
      props.errorText.value = `Centrifuge subscription error (${ctx.type}): ${ctx.error.message}`
    })
    opcDataChangeSubscription.on("publication", patchMachineData)
    opcDataChangeSubscription.subscribe()

    centrifuge.connect()

    return () => {
      clearTimeout(updateTimeoutHandle)
      centrifuge.disconnect()
    }
  }, [])

  return (
    <span class={clsx(props.class, "flex", "items-center", "gap-0")}>
      <span>Centrifugo</span>
      <b
        data-testid="centrifugo-transport"
        class={clsx("ml-0.5", "opacity-50", transportColor(centrifugoTransport.value))}
      >
        {transportText(centrifugoTransport.value)}
      </b>
      <Icon
        data-testid="centrifugo-status-icon"
        class={clsx("ml-1", "size-4", statusColor(centrifugoLinkStatus.value))}
        iconSvg={statusIcon(centrifugoLinkStatus.value)}
      />
      <span class="ml-3">PLC</span>
      <Icon
        data-testid="plc-status-icon"
        class={clsx("ml-1", "size-4", statusColor(plcShownStatus.value))}
        iconSvg={statusIcon(plcShownStatus.value)}
      />
    </span>
  )
}
