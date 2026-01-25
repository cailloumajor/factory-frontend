import { type Signal, useComputed } from "@preact/signals"
import { clsx } from "clsx"

import { Icon } from "@/components/Icon.tsx"

interface MetricProps {
  /** The icon SVG path (e.g. from `@mdi/js`). */
  icon: string
  /** The title of the metrics. */
  title: string
  /** The optional unit to display next to the value. */
  unit?: string
  /** The metric value. NaN value will be hidden. */
  value: Signal<number | string>
  /** The optional color class to apply to the value. */
  colorClass?: Signal<string>
  /** Whether the metric value is temporarily unavailable, displaying a skeleton. */
  loading: Signal<boolean>
}

export function Metric(props: MetricProps) {
  const valueClass = useComputed(() =>
    props.loading.value
      ? ["inline-block", "min-w-1/3", "skeleton", "text-transparent", "select-none"]
      : Number.isNaN(props.value.value)
      ? "invisible"
      : ""
  )
  const value = useComputed(() => Number.isNaN(props.value.value) ? "000" : props.value.value)

  return (
    <div class="card bg-base-200 min-w-2/3">
      <div class="card-body items-center p-[1vh]">
        <h2 class="card-title text-2xl">
          <Icon class="size-6" iconSvg={props.icon} />
          {props.title}
        </h2>
        <span
          class={clsx("text-7xl", valueClass.value, props.colorClass?.value)}
          data-testid="metric-value"
        >
          {value}
          {!props.loading.value && (
            <span class="ml-1 text-4xl text-primary-content opacity-70">{props.unit}</span>
          )}
        </span>
      </div>
    </div>
  )
}
