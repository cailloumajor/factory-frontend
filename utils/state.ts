import { createDefine } from "fresh"

import type { AppConfig } from "./config.ts"
import type { getTranslateFn } from "./i18n.ts"

export interface State {
  appConfig: AppConfig
  t: ReturnType<typeof getTranslateFn>
}

export const define = createDefine<State>()
