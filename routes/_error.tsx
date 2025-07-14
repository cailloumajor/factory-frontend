import { HttpError, page } from "fresh"

import { getTranslateFn } from "../utils/i18n.ts"
import { define } from "../utils/state.ts"

export const handler = define.handlers((ctx) => {
  const isApiReq = [ctx.state.appConfig.computeApi.baseUrl].some(
    (baseUrl) => ctx.url.pathname.startsWith(baseUrl),
  )

  if (isApiReq) {
    return ctx.next()
  }

  return page()
})

export default define.page(function ErrorPage({ state, error, req }) {
  // FIXME: https://github.com/denoland/fresh/issues/2843
  const t = state.t ?? getTranslateFn(req)

  const status = error instanceof HttpError ? error.status : 500

  return (
    <main class="fixed top-0 bottom-0 left-0 right-0 flex flex-col justify-center text-center">
      <h1 class="text-9xl/normal text-error">{status}</h1>
      <h2 class="text-6xl opacity-40">
        {
          // @ts-ignore: template literal cannot be typed
          t([`error.${status}`, "error.other"])
        }
      </h2>
      {status === 404 && <a class="btn mt-8 mx-auto" href="/">{t("goHome")}</a>}
    </main>
  )
})
