import { createDefine } from "fresh"

import type { getTranslateFn } from "./i18n.ts"

export interface State {
  t: ReturnType<typeof getTranslateFn>
}

export const define = createDefine<State>()
