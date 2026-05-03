import { type Signal, signal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import * as z from "zod"

export interface DashboardConfig {
  title: Signal<string>
  targetCycleTime: Signal<number>
  targetEfficiency: Signal<number>
}

export function createDashboardConfig(): DashboardConfig {
  return {
    title: signal("⏳"),
    targetCycleTime: signal(1),
    targetEfficiency: signal(1),
  }
}

const configKeys = Object.keys(createDashboardConfig()) as (keyof DashboardConfig)[]

const configSchema = z.object({
  title: z.string(),
  targetCycleTime: z.number().positive(),
  targetEfficiency: z.number().positive(),
})

interface ConfigSyncProps {
  /** The URL of the API to fetch for data. */
  apiUrl: string
  /** The interval in milliseconds at which the config should be re-fetched. */
  refreshMillis: number
  /** The configuration object of reactive values. */
  config: DashboardConfig
  /** The error text to be displayed, if any. */
  errorText: Signal<string>
}

/**
 * Manages querying the configuration API for the dashboard.
 *
 * If an error occurs, renders an alert.
 */
export function ConfigSync(props: ConfigSyncProps) {
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
            props.errorText.value = ""
          } else {
            // deno-lint-ignore no-console -- console is used by purpose
            console.error(z.prettifyError(result.error))
            throw new Error("Configuration format error (see console)")
          }
        })
        .catch(({ message }) => {
          props.errorText.value = String(message)
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

  return null
}
