import {
  mdiBullseye,
  mdiCheckOutline,
  mdiSpeedometer,
  mdiTimerOutline,
  mdiTrashCanOutline,
} from "@mdi/js"
import { type Signal, useComputed, useSignal } from "@preact/signals"

import { usePreferredLanguages } from "@/hooks/usePreferredLanguages.ts"

import type { DashboardConfig } from "./ConfigSync.tsx"
import type { MachineData } from "./MachineDataLink.tsx"
import { Metric } from "./Metric.tsx"
import { StatusCard, type StatusTexts } from "./StatusCard.tsx"

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
}

/** Renders the dashboard metrics. */
export function Metrics(props: MetricsProps) {
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

  // TODO: Do real things here.
  const performance = useSignal(NaN)

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
        value={performance}
        loading={props.machineData.invalid}
      />
    </div>
  )
}
