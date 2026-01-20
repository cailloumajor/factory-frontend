import { type Signal, useComputed } from "@preact/signals"
import { clsx } from "clsx"

import { Icon } from "@/components/Icon.tsx"

interface DashboardMetricProps {
  /** The icon SVG path (e.g. from `@mdi/js`). */
  icon: string
  /** The title of the metrics. */
  title: string
  /** The optional unit to display with the title. */
  unit?: string
  /** The metric value. NaN value will be hidden. */
  value: Signal<number | string>
  /** The optional color class to apply to the value. */
  colorClass?: Signal<string>
  /** Whether the metric value is temporarily unavailable, displaying a skeleton. */
  loading: Signal<boolean>
}

export function DashboardMetric(props: DashboardMetricProps) {
  const value = useComputed(() => Number.isNaN(props.value.value) ? "000" : props.value.value)
  const valueClass = useComputed(() =>
    props.loading.value
      ? ["skeleton", "text-transparent", "select-none"]
      : Number.isNaN(props.value.value)
      ? "opacity-2"
      : props.colorClass?.value
  )

  return (
    <div class="card card-border shadow-md shadow-base-content/10">
      <div class="card-body">
        <h2 class="card-title">
          <Icon class="size-6" iconSvg={props.icon} />
          {props.title}
        </h2>
        <p
          class={clsx("text-5xl", valueClass.value)}
          data-testid="metric-value"
        >
          {value}
          <span class="ml-1 text-3xl opacity-70">{props.unit}</span>
        </p>
      </div>
    </div>
  )
}
