import { useEffect } from "preact/hooks"
import { useSignal } from "@preact/signals"

export function usePreferredLanguages() {
  const languages = useSignal(navigator.languages)

  useEffect(() => {
    globalThis.addEventListener("languagechange", () => {
      languages.value = navigator.languages
    })
  })

  return languages
}
