import type { Middleware } from "fresh"

import type { State } from "./state.ts"

const defaultRefreshMillis = 10000

function getEnvString(key: string, defaultValue?: string) {
  const raw = Deno.env.get(key)
  if (raw === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable ${key}`)
    }

    return defaultValue
  }

  return raw
}

function getEnvNumber(key: string, defaultValue?: number) {
  const raw = Deno.env.get(key)
  if (raw === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable ${key}`)
    }

    return defaultValue
  }

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new Error(`Failed to parse a number from ${key} environment variable`)
  }

  return value
}

function getEnvStringArray(key: string, defaultValue?: string[]) {
  const raw = Deno.env.get(key)
  if (raw === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable ${key}`)
    }

    return defaultValue
  }

  return raw.split(",")
}

function getAppConfig() {
  return {
    shiftStartTimes: getEnvStringArray("SHIFT_START_TIMES"),
    dashboardConfig: {
      baseApiPath: getEnvString("DASHBOARD_CONFIG_BASE_API_PATH"),
      refreshMillis: getEnvNumber("DASHBOARD_CONFIG_REFRESH_MILLIS", defaultRefreshMillis),
    },
    timeline: {
      baseApiPath: getEnvString("TIMELINE_BASE_API_PATH"),
      refreshMillis: getEnvNumber("TIMELINE_REFRESH_MILLIS", defaultRefreshMillis),
      intervalMinutes: getEnvNumber("TIMELINE_INTERVAL_MINUTES", 60),
      offsetMinutes: getEnvNumber("TIMELINE_OFFSET_MINUTES"),
    },
    performance: {
      baseApiPath: getEnvString("PERFORMANCE_BASE_API_PATH"),
      refreshMillis: getEnvNumber("PERFORMANCE_REFRESH_MILLIS", defaultRefreshMillis),
    },
    centrifugoBasePath: getEnvString("CENTRIFUGO_BASE_PATH"),
    machineData: {
      centrifugoNamespace: getEnvString("MACHINE_DATA_CENTRIFUGO_NAMESPACE"),
      plcTimeoutMillis: getEnvNumber("MACHINE_DATA_PLC_TIMEOUT_MILLIS"),
    },
  }
}

export type AppConfig = ReturnType<typeof getAppConfig>

export function appConfig(): Middleware<State> {
  const gotAppConfig = getAppConfig()

  return function configMiddleware(ctx) {
    ctx.state.appConfig = gotAppConfig

    return ctx.next()
  }
}
