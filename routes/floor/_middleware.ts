import { setCookie } from "@std/http/cookie"

import { define } from "@/utils/state.ts"

export default define.middleware(async (ctx) => {
  const prefix = "/floor/"

  const pathname = ctx.url.pathname
  if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
    const subpath = pathname.slice(prefix.length)
    try {
      const resp = await ctx.next()
      setCookie(resp.headers, {
        name: "floor-subpath",
        value: subpath,
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      })

      return resp
    } catch (err) {
      // deno-lint-ignore no-console -- console is used by purpose
      console.error("Failed to set floor subpath cookie:", err)
    }
  }

  return await ctx.next()
})
