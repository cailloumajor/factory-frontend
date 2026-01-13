import { clsx } from "clsx"
import type { HTMLAttributes } from "preact"
import { mdiAlertCircle } from "@mdi/js"
import type { Signal } from "@preact/signals"

import { Icon } from "@/components/Icon.tsx"

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** The error text that should be displayed. If empty, the alert will be hidden. */
  errorText: Signal<string>
}

/** An alert display, only displayed if error message is not empty. */
export function Alert(props: AlertProps) {
  return (
    <div
      role="alert"
      class={clsx("alert", "alert-error", !props.errorText.value && "hidden", props.class)}
    >
      <Icon class="size-5" iconSvg={mdiAlertCircle}></Icon>
      <span>{props.errorText}</span>
    </div>
  )
}
