import { toSnakeCase } from "@std/text"
import type { MiddlewareFn } from "fresh"

import type { State } from "./state.ts"

import configJson from "../config/app_config.json" with { type: "json" }

export type AppConfig = typeof configJson

export function envOverridden<T extends Record<string, unknown>>(obj: T, keyPrefix?: string) {
  const out: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(obj)) {
    const prefixedKey = keyPrefix ? `${keyPrefix ?? ""}.${key}` : key

    if (typeof val === "object" && val !== null) {
      if (Array.isArray(val)) {
        throw new Error("Arrays are not supported")
      }
      const inner = envOverridden(val as T, prefixedKey)
      out[key] = inner
      continue
    }

    const envKey = toSnakeCase(prefixedKey).toUpperCase()
    const envVal = Deno.env.get(envKey)
    if (envVal == null) {
      out[key] = val
      continue
    }

    if (typeof val === "string") {
      out[key] = envVal
    } else if (typeof val === "number") {
      const newVal = parseInt(envVal)
      if (Number.isNaN(newVal)) {
        throw new Error(`Failed to parse the number: ${envVal}`)
      }
      out[key] = newVal
    } else if (typeof val === "boolean") {
      out[key] = envVal === "1"
    } else {
      throw new Error(`Unsupported value type: ${typeof val}`)
    }
  }

  return out
}

export function appConfig(): MiddlewareFn<State> {
  const appConfig = envOverridden(configJson)

  return function configMiddleware(ctx) {
    ctx.state.appConfig = appConfig

    return ctx.next()
  }
}
