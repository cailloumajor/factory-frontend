import { type Signal, useComputed } from "@preact/signals"
import { clsx } from "clsx"
import type { HTMLAttributes } from "preact"

import type { MachineData } from "./MachineDataLink.tsx"
import { CycleTimeStatus } from "./Metrics.tsx"

type Statuses = "runAtCadence" | "runUnderCadence" | "campaignChange" | "stopped"

export type StatusTexts = {
  [K in Statuses]: string
}

enum ProductionStatus {
  RunAtCadence,
  RunUnderCadence,
  CampaignChange,
  Stopped,
}

interface StatusCardProps extends HTMLAttributes<HTMLDivElement> {
  /** The text for each status. */
  statuses: StatusTexts
  /** The reactive machine data. */
  machineData: MachineData
  /** The reactive cycle time status. */
  cycleTimeStatus: Signal<CycleTimeStatus>
}

export function StatusCard(props: StatusCardProps) {
  const prodStatus = useComputed(() =>
    props.machineData.val.cycle.value
      ? props.machineData.val.cycleTimeOver.value
        ? ProductionStatus.Stopped
        : props.cycleTimeStatus.value === CycleTimeStatus.Good
        ? ProductionStatus.RunAtCadence
        : ProductionStatus.RunUnderCadence
      : props.machineData.val.campChange.value
      ? ProductionStatus.CampaignChange
      : ProductionStatus.Stopped
  )

  const statusText = useComputed(() =>
    ({
      [ProductionStatus.RunAtCadence]: props.statuses.runAtCadence,
      [ProductionStatus.RunUnderCadence]: props.statuses.runUnderCadence,
      [ProductionStatus.CampaignChange]: props.statuses.campaignChange,
      [ProductionStatus.Stopped]: props.statuses.stopped,
    })[prodStatus.value]
  )
  const statusColor = useComputed(() =>
    ({
      [ProductionStatus.RunAtCadence]: "text-success",
      [ProductionStatus.RunUnderCadence]: "text-warning",
      [ProductionStatus.CampaignChange]: "text-info",
      [ProductionStatus.Stopped]: "text-error",
    })[prodStatus.value]
  )

  return (
    <div class={clsx("card", "text-center", props.class)}>
      <div class="card-body">
        <div
          class={clsx(
            "text-5xl",
            "uppercase",
            statusColor.value,
            prodStatus.value === ProductionStatus.Stopped && "is-status-stopped",
          )}
        >
          {statusText}
        </div>
      </div>
    </div>
  )
}
