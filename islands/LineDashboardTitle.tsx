import type { Signal } from "@preact/signals"

interface LineDashboardTitleProps {
  name: Signal<string>
  campaign: Signal<string>
}

export function LineDashboardTitle(props: LineDashboardTitleProps) {
  return (
    <>
      <span>{props.name}</span>
      <span class="mx-1">—</span>
      <span>{props.campaign}</span>
    </>
  )
}
