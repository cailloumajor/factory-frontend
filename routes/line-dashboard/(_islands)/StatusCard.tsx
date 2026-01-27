import { DurationFormat } from "@formatjs/intl-durationformat"
import { type Signal, useComputed, useSignal } from "@preact/signals"
import { clsx } from "clsx"
import type { HTMLAttributes } from "preact"
import { useEffect } from "preact/hooks"

import { usePreferredLanguages } from "@/hooks/usePreferredLanguages.ts"

import type { MachineData } from "./MachineDataLink.tsx"
import { CycleTimeStatus } from "./Metrics.tsx"

type Statuses = "runAtCadence" | "runUnderCadence" | "campaignChange" | "stopped" | "since"

export type StatusTexts = {
  [K in Statuses]: string
}

enum ProductionStatus {
  RunAtCadence,
  RunUnderCadence,
  CampaignChange,
  Stale,
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
  const languages = usePreferredLanguages()
  const now = useSignal(Date.now())

  const durationFormatter = useComputed(() =>
    new DurationFormat(languages.value as string[], {
      style: "long",
    })
  )

  useEffect(() => {
    const handle = setInterval(() => {
      now.value = Date.now()
    }, 10_000)

    return () => {
      clearInterval(handle)
    }
  }, [])

  const prodStatus = useComputed(() =>
    props.machineData.val.cycle.value
      ? props.machineData.val.cycleTimeOver.value
        ? ProductionStatus.Stale
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
      [ProductionStatus.Stale]: props.statuses.stopped,
      [ProductionStatus.Stopped]: props.statuses.stopped,
    })[prodStatus.value]
  )
  const statusColor = useComputed(() =>
    ({
      [ProductionStatus.RunAtCadence]: "text-success",
      [ProductionStatus.RunUnderCadence]: "text-warning",
      [ProductionStatus.CampaignChange]: "text-info",
      [ProductionStatus.Stale]: "text-error",
      [ProductionStatus.Stopped]: "text-error",
    })[prodStatus.value]
  )

  const stoppedBackgroundClass = useComputed(() =>
    prodStatus.value === ProductionStatus.Stopped ||
      prodStatus.value === ProductionStatus.Stale
      ? "is-status-stopped"
      : ""
  )

  const ts = useComputed(() =>
    ({
      [ProductionStatus.RunAtCadence]: "",
      [ProductionStatus.RunUnderCadence]: "",
      [ProductionStatus.CampaignChange]: props.machineData.ts.campChange.value,
      [ProductionStatus.Stale]: props.machineData.ts.goodParts.value,
      [ProductionStatus.Stopped]: props.machineData.ts.cycle.value,
    })[prodStatus.value]
  )
  const statusSince = useComputed(() => {
    const parsedTs = Date.parse(ts.value)

    if (Number.isNaN(parsedTs)) {
      return {}
    }

    const totalMinutes = Math.floor((now.value - parsedTs) / 60_000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const duration = { hours, minutes }

    return {
      since: durationFormatter.value.format(duration),
      ts: new Date(parsedTs).toLocaleString(),
    }
  })

  return (
    <div class={clsx("card", "text-center", props.class)}>
      <div class="card-body">
        {props.machineData.invalid.value
          ? <div class="skeleton h-12" data-testid="status-skeleton"></div>
          : (
            <>
              <div
                class={clsx(
                  "text-6xl",
                  "uppercase",
                  statusColor.value,
                  stoppedBackgroundClass.value,
                )}
              >
                {statusText}
              </div>
              {ts.value && (
                <div class="text-2xl">
                  {`${props.statuses.since} ${statusSince.value.since} (${statusSince.value.ts})`}
                </div>
              )}
            </>
          )}
      </div>
    </div>
  )
}
