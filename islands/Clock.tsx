import type { HTMLAttributes } from "preact"
import { useEffect } from "preact/hooks"
import { useComputed, useSignal } from "@preact/signals"

interface ClockProps extends HTMLAttributes<HTMLDivElement> {
  /** The interval in milliseconds at which the clock must be refreshed */
  refreshMillis: number
}

/** Displays the current date and time, refreshed every provided interval */
export function Clock(props: ClockProps) {
  const clockFormat = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const date = useSignal(new Date())
  const clock = useComputed(() => clockFormat.format(date.value))

  useEffect(() => {
    const handle = setInterval(() => {
      date.value = new Date()
    }, props.refreshMillis)

    return () => {
      clearInterval(handle)
    }
  })

  return <div class={props.class}>{clock}</div>
}
