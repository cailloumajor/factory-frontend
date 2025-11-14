import { acceptsLanguages } from "@std/http"
import type { Middleware } from "fresh"
import { getFixedT, init } from "i18next"

import type { State } from "@/utils/state.ts"

import en from "@/locales/en.json" with { type: "json" }
import fr from "@/locales/fr.json" with { type: "json" }

declare module "i18next" {
  export interface CustomTypeOptions {
    enableSelector: true
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

export async function i18n(): Promise<Middleware<State>> {
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
