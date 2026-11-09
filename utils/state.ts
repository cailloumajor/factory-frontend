import { createDefine } from "fresh"
import type { TFunction } from "i18next"

import type { AppConfig } from "./config.ts"

export interface State {
  appConfig: AppConfig
  t: TFunction
}

export const define = createDefine<State>()
