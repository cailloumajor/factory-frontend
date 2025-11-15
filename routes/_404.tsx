import { page } from "fresh"

import { define } from "@/utils/state.ts"

export const handler = define.handlers((ctx) => {
  const isApiReq = Object.values(ctx.state.appConfig.apiBaseUrl).some(
    (baseUrl) => ctx.url.pathname.startsWith(baseUrl),
  )

  if (isApiReq) {
    return ctx.next()
  }

  return page(undefined, { status: 404 })
})

export default define.page(({ state }) => {
  return (
    <main class="fixed top-0 bottom-0 left-0 right-0 flex flex-col justify-center text-center">
      <h1 class="text-9xl/normal text-error">404</h1>
      <h2 class="text-6xl opacity-40">{state.t(($) => $.notFound)}</h2>
      <a class="btn mt-8 mx-auto" href="/">{state.t(($) => $.goHome)}</a>
    </main>
  )
})
