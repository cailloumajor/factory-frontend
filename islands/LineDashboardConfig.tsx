import { mdiAlertCircle } from "@mdi/js"
import { signal, useSignal } from "@preact/signals"
import { clsx } from "clsx"
import type { JSX } from "preact"
import { useEffect } from "preact/hooks"
import * as z from "zod"

import { Icon } from "../components/Icon.tsx"

export const dashboardConfig = {
  title: signal("⏳"),
  targetCycleTime: signal(1),
  targetEfficiency: signal(1),
}

type DashboardConfig = typeof dashboardConfig

const configKeys = Object.keys(dashboardConfig) as (keyof DashboardConfig)[]

const configSchema = z.object({
  title: z.string(),
  targetCycleTime: z.number().positive(),
  targetEfficiency: z.number().positive(),
})

interface LineDashboardConfigProps extends JSX.HTMLAttributes<Element> {
  /** The URL of the API to fetch for data. */
  apiUrl: string
  /** The interval in milliseconds at which the config should be re-fetched. */
  refreshMillis: number
  /** The configuration object of reactive values. */
  config: DashboardConfig
}

/**
 * Manages querying the configuration API for the dashboard.
 *
 * If an error occurs, renders an alert.
 */
export function LineDashboardConfig(props: LineDashboardConfigProps) {
  const errorText = useSignal("")

  useEffect(() => {
    const abort = new AbortController()
    let timeoutHandle: number

    function updateConfig() {
      fetch(props.apiUrl, { signal: abort.signal })
        .then((resp) => {
          if (!resp.ok) {
            throw new Error(`HTTP error, status: ${resp.status} ${resp.statusText}`)
          }
          return resp.json()
        })
        .then((config) => configSchema.safeParseAsync(config))
        .then((result) => {
          if (result.success) {
            for (const k of configKeys) {
              props.config[k].value = result.data[k]
            }
            errorText.value = ""
          } else {
            // deno-lint-ignore no-console -- console is used by purpose
            console.error(z.prettifyError(result.error))
            throw new Error("Configuration format error (see console)")
          }
        })
        .catch(({ message }) => {
          errorText.value = `Dashboard config: ${message}`
        })
        .finally(() => {
          timeoutHandle = setTimeout(updateConfig, props.refreshMillis)
        })
    }

    updateConfig()

    return () => {
      clearTimeout(timeoutHandle)
      abort.abort()
    }
  }, [])

  return (
    <div
      role="alert"
      class={clsx("alert", "alert-error", !errorText.value && "hidden", props.class)}
    >
      <Icon class="size-5" iconSvg={mdiAlertCircle}></Icon>
      <span>{errorText}</span>
    </div>
  )
}
