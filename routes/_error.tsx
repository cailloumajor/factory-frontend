import { HttpError, page } from "fresh"

import { define } from "@/utils/state.ts"

export const handler = define.handlers({
  GET(ctx) {
    if (ctx.error instanceof HttpError) {
      return page({ errorCode: ctx.error.status })
    }

    // deno-lint-ignore no-console -- console is used by purpose
    console.error(ctx.error)

    return ctx.next()
  },
})

export default define.page<typeof handler>((ctx) => {
  return (
    <main class="fixed top-0 bottom-0 left-0 right-0 flex flex-col justify-center text-center">
      {ctx.data.errorCode && <h1 class="text-9xl/normal text-error">{ctx.data.errorCode}</h1>}
      <h2 class="text-6xl opacity-40">
        {ctx.state.t(($) => $.httpError[ctx.data.errorCode === 404 ? "404" : "unspecific"])}
      </h2>
      <a class="btn mt-8 mx-auto" href="/">{ctx.state.t(($) => $.goHome)}</a>
    </main>
  )
})
