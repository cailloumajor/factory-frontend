import type { Middleware } from "fresh"

import type { State } from "./state.ts"

function getEnvString(key: string, defaultValue: string) {
  return Deno.env.get(key) || defaultValue
}

function getEnvNumber(key: string, defaultValue: number) {
  const raw = Deno.env.get(key)
  if (raw === undefined) {
    return defaultValue
  }

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new Error(`Failed to parse a number from ${key} environment variable`)
  }

  return value
}

function getEnvStringArray(key: string, defaultValue: string[]) {
  const raw = Deno.env.get(key)
  if (raw === undefined) {
    return defaultValue
  }

  return raw.split(",")
}

function getAppConfig() {
  return {
    shiftStartTimes: getEnvStringArray("SHIFT_START_TIMES", ["04:20", "12:20", "20:20"]),
    dashboardConfig: {
      baseApiPath: getEnvString(
        "DASHBOARD_CONFIG_BASE_API_PATH",
        "/dev-config-api/config/line_dashboard",
      ),
      refreshMillis: getEnvNumber("DASHBOARD_CONFIG_REFRESH_MILLIS", 4500),
    },
    timeline: {
      baseApiPath: getEnvString("TIMELINE_BASE_API_PATH", "/dev-compute-api/timeline"),
      refreshMillis: getEnvNumber("TIMELINE_REFRESH_MILLIS", 5000),
      intervalMinutes: getEnvNumber("TIMELINE_INTERVAL_MINUTES", 40),
      offsetMinutes: getEnvNumber("TIMELINE_OFFSET_MINUTES", 20),
    },
    performance: {
      baseApiPath: getEnvString("PERFORMANCE_BASE_API_PATH", "/dev-compute-api/performance"),
      refreshMillis: getEnvNumber("PERFORMANCE_REFRESH_MILLIS", 5500),
    },
    centrifugoBasePath: getEnvString("CENTRIFUGO_BASE_PATH", "/dev-centrifugo/"),
    machineData: {
      centrifugoNamespace: getEnvString("MACHINE_DATA_CENTRIFUGO_NAMESPACE", "opcua.data"),
      plcTimeoutMillis: getEnvNumber("MACHINE_DATA_REFRESH_MILLIS", 8000),
    },
  }
}

export type AppConfig = ReturnType<typeof getAppConfig>

export function appConfig(): Middleware<State> {
  return function configMiddleware(ctx) {
    ctx.state.appConfig = getAppConfig()

    return ctx.next()
  }
}
