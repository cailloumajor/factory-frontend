import type { Signal } from "@preact/signals"
import { clsx } from "clsx/lite"

import { Icon } from "../components/Icon.tsx"

interface DashboardMetricProps {
  /** The icon SVG path  (e.g. from `@mdi/js`). */
  icon: string
  /** The title of the metrics. */
  title: string
  /** The optional unit to display with the title. */
  unit?: string
  /** The metric value. NaN value will be displayed as no value. */
  value: Signal<number>
  /** The optional color class to apply to the value. */
  colorClass?: Signal<string>
  /** Whether the metric is disabled, displaying a skeleton. */
  disabled: Signal<boolean>
}

export function DashboardMetric(props: DashboardMetricProps) {
  const isNaNValue = Number.isNaN(props.value.value)
  const disabledClasses = props.disabled.value && ["skeleton", "text-transparent", "select-none"]
  const colorClass = isNaNValue ? "opacity-2" : props.colorClass?.value

  return (
    <div class="card card-border shadow-md shadow-base-content/10">
      <div class="card-body">
        <h2 class="card-title">
          <Icon class="size-6" iconSvg={props.icon} />
          {props.title}
        </h2>
        <p
          class={clsx("text-5xl", disabledClasses, colorClass)}
          data-testid="metric-value"
        >
          {isNaNValue ? "000" : props.value}
          <span class="ml-1 text-3xl opacity-70">{props.unit}</span>
        </p>
      </div>
    </div>
  )
}
