import { HttpError } from "fresh"

import { getTranslateFn } from "../utils/i18n.ts"
import { define } from "../utils/state.ts"

export default define.page(function ErrorPage({ state, error, req }) {
  // FIXME: https://github.com/denoland/fresh/issues/2843
  const t = state.t ?? getTranslateFn(req)

  const status = error instanceof HttpError ? error.status : 500

  return (
    <main class="fixed top-0 bottom-0 left-0 right-0 flex flex-col justify-center text-center bg-blue-400 text-white">
      <h1 class="text-9xl/normal">{status}</h1>
      <h2 class="text-6xl opacity-40">
        {
          // @ts-ignore: template literal cannot be typed
          t([`error.${status}`, "error.other"])
        }
      </h2>
      {status === 400 && (
        <a
          class="cursor-pointer bg-white text-blue-400 font-medium mx-auto mt-8 px-4 py-2 rounded-sm"
          href="/"
        >
          {t("goHome")}
        </a>
      )}
    </main>
  )
})
