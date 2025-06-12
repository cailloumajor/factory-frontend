import * as path from "@std/path"
import tailwindPlugin from "@tailwindcss/postcss"
import type { MiddlewareFn } from "fresh"
import type { FreshBuilder } from "fresh/dev"
import { serveDir } from "@std/http"
import postcss from "postcss"

const urlRegex = /(url\(\s*['"]?)([^"')]+)(["']?\s*\).*)$/
const fontBasePath = "/node_modules/@fontsource-variable/"
const fontBaseUrl = "/fonts/fontsource/"

export function styleTransformPlugin<T>(builder: FreshBuilder, minify: boolean) {
  const cssProcessor = postcss([
    tailwindPlugin({ optimize: { minify } }),

    // Rewrite URLs in CSS for self-hosted fonts from fontsource.
    (root, _result) => {
      root.walkAtRules("font-face", (rule) => {
        rule.walkDecls("src", (decl) => {
          const urlMatch = urlRegex.exec(decl.value)
          const url = urlMatch && urlMatch.at(2)
          if (url == null) {
            return
          }
          const subStringPos = url.indexOf(fontBasePath)
          if (subStringPos <= 0) {
            return
          }
          const pathEnd = url.slice(subStringPos + fontBasePath.length)
          decl.value = decl.value.replace(url, `${fontBaseUrl}${pathEnd}`)
        })
      })
    },
  ])

  builder.onTransformStaticFile(
    { pluginName: "postcss", filter: /\.css$/ },
    async (args) => {
      const result = await cssProcessor.process(args.text, { from: args.path })
      return {
        content: result.content,
        map: result.map?.toString(),
      }
    },
  )
}

export function fonts<T>(): MiddlewareFn<T> {
  return function fontsMiddleware(ctx) {
    const url = URL.parse(ctx.req.url)
    if (url?.pathname.startsWith(fontBaseUrl)) {
      return serveDir(ctx.req, {
        fsRoot: path.join(ctx.config.root, fontBasePath),
        urlRoot: fontBaseUrl.slice(1),
        showIndex: false,
        quiet: true,
      })
    }

    return ctx.next()
  }
}
