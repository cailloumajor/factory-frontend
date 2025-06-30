import { type Signal, useComputed } from "@preact/signals"
import classNames from "classnames"

import { Icon } from "../components/Icon.tsx"

export const metricColors = ["success", "warning", "danger"] as const

export type MetricColor = typeof metricColors[number]

interface DashboardMetricProps {
  /** The icon SVG path  (e.g. from `@mdi/js`). */
  icon: string
  /** The title of the metrics. */
  title: string
  /** The optional unit to display with the title. */
  unit?: string
  /** The metric value. NaN value will be displayed as no value. */
  value: Signal<number>
  /** The optional color in which to display the value. */
  color?: Signal<MetricColor>
  /** Whether the metric is disabled, displaying a skeleton. */
  disabled: Signal<boolean>
}

export function DashboardMetric(props: DashboardMetricProps) {
  const unitText = props.unit ? ` (${props.unit})` : ""
  const disabledOrNaN = useComputed(() => props.disabled.value || Number.isNaN(props.value.value))
  const valueClass = useComputed(() =>
    classNames(
      "content",
      "is-size-1",
      props.disabled.value && "skeleton-block",
      !disabledOrNaN.value && props.color && `has-text-${props.color.value}`,
    )
  )
  const valueStyle = {
    "--bulma-skeleton-block-min-height": "1em",
  }
  const metricValue = useComputed(() => disabledOrNaN.value ? "---" : props.value.value)

  return (
    <div class="card">
      <header class="card-header">
        <span class="card-header-icon">
          <Icon iconSvg={props.icon}></Icon>
        </span>
        <p class="card-header-title">{props.title + unitText}</p>
      </header>
      <div class="card-content is-flex is-justify-content-center">
        <strong class={valueClass} style={valueStyle} data-testid="metric-value">
          {metricValue}
        </strong>
      </div>
    </div>
  )
}
