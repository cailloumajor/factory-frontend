import { acceptsLanguages } from "@std/http"
import { getFixedT, init } from "i18next"

import en from "./locales/en.json" with { type: "json" }
import fr from "./locales/fr.json" with { type: "json" }
import type { MiddlewareFn } from "fresh"
import type { State } from "./utils.ts"

declare module "i18next" {
  export interface CustomTypeOptions {
    resources: {
      translation: typeof en
    }
  }
}

const resources = {
  en: {
    translation: en,
  },
  fr: {
    translation: fr,
  },
} as const

type Language = keyof typeof resources

const supportedLanguages = Object.keys(resources) as Language[]

const defaultLanguage: Language = "en"

function isLanguage(value: string): value is Language {
  return supportedLanguages.includes(value as Language)
}

export function getTranslateFn(req: Request) {
  const candidate = acceptsLanguages(req, ...supportedLanguages)
  const lang = candidate !== undefined && isLanguage(candidate) ? candidate : defaultLanguage
  return getFixedT(lang)
}

export async function i18n(): Promise<MiddlewareFn<State>> {
  await init({
    fallbackLng: defaultLanguage,
    resources,
    preload: supportedLanguages,
  })

  return function i18nMiddleware(ctx) {
    ctx.state.t = getTranslateFn(ctx.req)

    return ctx.next()
  }
}
