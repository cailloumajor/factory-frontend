import type { Middleware } from "fresh"
import i18next from "i18next"
import { freshPlugin, LanguageDetector } from "i18next-http-middleware"

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

export async function i18n(): Promise<Middleware<State>> {
  await i18next
    .use(LanguageDetector)
    .init({
      fallbackLng: defaultLanguage,
      resources,
      preload: supportedLanguages,
    })

  return freshPlugin(i18next)
}
