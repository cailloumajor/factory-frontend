import { HttpError } from "fresh"

import { getTranslateFn } from "../utils/i18n.ts"
import { define } from "../utils/state.ts"

export default define.page(function ErrorPage({ state, error, req }) {
  // FIXME: https://github.com/denoland/fresh/issues/2843
  const t = state.t ?? getTranslateFn(req)

  const status = error instanceof HttpError ? error.status : 500

  return (
    <main class="hero is-fullheight">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-spaced" style={{ "--bulma-title-size": "8rem" }}>{status}</h1>
          <h2 class="subtitle is-1">
            {
              // @ts-ignore: template literal cannot be typed
              t([`error.${status}`, "error.other"])
            }
          </h2>
          {status === 404 && <a class="button mt-5" href="/">{t("goHome")}</a>}
        </div>
      </div>
    </main>
  )
})
