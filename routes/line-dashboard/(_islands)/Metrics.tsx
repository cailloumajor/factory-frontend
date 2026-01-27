import {
  mdiBullseye,
  mdiCheckOutline,
  mdiSpeedometer,
  mdiTimerOutline,
  mdiTrashCanOutline,
} from "@mdi/js"
import { useEffect } from "preact/hooks"
import { type Signal, useComputed, useSignal } from "@preact/signals"

import { usePreferredLanguages } from "@/hooks/usePreferredLanguages.ts"

import type { DashboardConfig } from "./ConfigSync.tsx"
import type { MachineData } from "./MachineDataLink.tsx"
import { Metric } from "./Metric.tsx"
import { StatusCard, type StatusTexts } from "./StatusCard.tsx"

// Add a level of import indirection to allow stubbing in tests.
export const indirectImports = {
  usePreferredLanguages,
  Metric,
  StatusCard,
}

export enum CycleTimeStatus {
  Good,
  Warn,
  Bad,
}

type TitleKeys = "goodParts" | "averageCycleTime" | "targetCycleTime" | "scrapParts" | "performance"

interface MetricsProps {
  /** The title for each of the metrics. */
  titles: {
    [K in TitleKeys]: string
  }
  /** The texts for the status card. */
  statusTexts: StatusTexts
  /** The reactive dashboard configuration. */
  config: DashboardConfig
  /** The reactive config error. */
  configError: Signal<string>
  /** The reactive machine data. */
  machineData: MachineData
  /** The URL of the API to fetch for performance value. */
  performanceApiUrl: string
  /** The interval in milliseconds at which the performance value should be refreshed. */
  performanceRefreshMillis: number
  /** The reactive performance fetch error. */
  performanceError: Signal<string>
}

/** Renders the dashboard metrics. */
export function Metrics(props: MetricsProps) {
  const { usePreferredLanguages, Metric, StatusCard } = indirectImports

  const languages = usePreferredLanguages()

  const fractionalFormatter = useComputed(() =>
    new Intl.NumberFormat(languages.value, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
  )

  const cycleTimeStatus = useComputed(() => {
    if (props.machineData.val.averageCycleTime.value <= 0) {
      return CycleTimeStatus.Bad
    }
    const ratio = props.machineData.val.averageCycleTime.value / props.config.targetCycleTime.value
    return ratio >= 1.1
      ? CycleTimeStatus.Bad
      : ratio >= 1.05
      ? CycleTimeStatus.Warn
      : CycleTimeStatus.Good
  })

  const currentCycleTime = useComputed(() =>
    fractionalFormatter.value.format(props.machineData.val.averageCycleTime.value)
  )
  const cycleTimeColor = useComputed(() => ({
    [CycleTimeStatus.Good]: "text-success",
    [CycleTimeStatus.Warn]: "text-warning",
    [CycleTimeStatus.Bad]: "text-error",
  }[cycleTimeStatus.value]))

  const targetCycleTime = useComputed(() =>
    fractionalFormatter.value.format(props.config.targetCycleTime.value)
  )
  const targetCycleTimeLoading = useComputed(() => !!props.configError.value)

  const scrapPartsColor = useComputed(() =>
    props.machineData.val.scrapParts.value > 0 ? "text-error" : "text-success"
  )

  const performance = useSignal(NaN)
  const performanceDisplay = useComputed(() => fractionalFormatter.value.format(performance.value))
  const performanceColor = useComputed(() => {
    const ratio = performance.value / 100 / props.config.targetEfficiency.value
    return ratio > 1 ? "text-success" : ratio > 0.9 ? "text-warning" : "text-error"
  })
  const performanceLoading = useComputed(() => !!props.performanceError.value)

  useEffect(() => {
    const abort = new AbortController()
    let timeoutHandle: number

    function updatePerformance() {
      fetch(props.performanceApiUrl, {
        headers: {
          "Client-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(1000)]),
      })
        .then((resp) => {
          if (!resp.ok) {
            throw new Error(`HTTP error, status: ${resp.status} ${resp.statusText}`)
          }
          return resp.json()
        })
        .then((val) => {
          performance.value = val
          props.performanceError.value = ""
        })
        .catch((err) => {
          props.performanceError.value = String(err)
        })
        .finally(() => {
          timeoutHandle = setTimeout(updatePerformance, props.performanceRefreshMillis)
        })
    }

    updatePerformance()

    return () => {
      clearTimeout(timeoutHandle)
      abort.abort()
    }
  }, [])

  return (
    <div class="grid grid-cols-3 gap-x-[5vw] gap-y-[3vh] pb-[2vh] justify-items-center">
      <Metric
        icon={mdiCheckOutline}
        title={props.titles.goodParts}
        value={props.machineData.val.goodParts}
        loading={props.machineData.invalid}
      />
      <Metric
        icon={mdiTimerOutline}
        title={props.titles.averageCycleTime}
        unit="s"
        value={currentCycleTime}
        colorClass={cycleTimeColor}
        loading={props.machineData.invalid}
      />
      <Metric
        icon={mdiBullseye}
        title={props.titles.targetCycleTime}
        unit="s"
        value={targetCycleTime}
        loading={targetCycleTimeLoading}
      />
      <Metric
        icon={mdiTrashCanOutline}
        title={props.titles.scrapParts}
        value={props.machineData.val.scrapParts}
        colorClass={scrapPartsColor}
        loading={props.machineData.invalid}
      />
      <StatusCard
        class="col-span-2 row-span-2 bg-base-200 min-w-9/10 my-auto"
        statuses={props.statusTexts}
        machineData={props.machineData}
        cycleTimeStatus={cycleTimeStatus}
      />
      <Metric
        icon={mdiSpeedometer}
        title={props.titles.performance}
        unit="%"
        value={performanceDisplay}
        colorClass={performanceColor}
        loading={performanceLoading}
      />
    </div>
  )
}
