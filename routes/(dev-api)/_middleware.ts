import { define } from "../../utils/state.ts"

export const handler = define.middleware((ctx) => {
  if (ctx.config.mode !== "development") {
    return new Response("This API can only be used on development", { status: 400 })
  }

  return ctx.next()
})
