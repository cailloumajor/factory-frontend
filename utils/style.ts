import { expandGlob } from "@std/fs"
import { serveFile } from "@std/http"
import * as path from "@std/path"
import tailwindPlugin from "@tailwindcss/postcss"
import { HttpError, type Middleware } from "fresh"
import type { Builder } from "fresh/dev"
import { transform } from "lightningcss"
import postcss from "postcss"

const hostedFontUrlPrefix = "/hosted-fonts/"

export function styleTransformPlugin(builder: Builder) {
  const hostedFontUrlRegex = /\/node_modules\/@fontsource[^/]*\/[^/]+\/files\/([^/]+)$/
  const processor = postcss([tailwindPlugin()])

  builder.onTransformStaticFile(
    { pluginName: "styles", filter: /styles\.css$/ },
    async (args) => {
      const processed = await processor.process(args.text, { from: args.path })

      const transformed = transform({
        code: new TextEncoder().encode(processed.css),
        filename: path.basename(args.path),
        minify: args.mode === "production",
        visitor: {
          Rule: {
            "font-face"(rule) {
              for (const prop of rule.value.properties) {
                if (prop.type !== "source") {
                  continue
                }
                for (const src of prop.value) {
                  if (src.type !== "url") {
                    continue
                  }
                  const match = hostedFontUrlRegex.exec(src.value.url.url)
                  if (match != null) {
                    src.value.url.url = hostedFontUrlPrefix + match[1]
                  }
                }
              }
              return rule
            },
          },
        },
      })

      return {
        content: transformed.code,
      }
    },
  )
}

export async function hostedFonts<T>(rootPath: string): Promise<Middleware<T>> {
  const fontFiles = await Array.fromAsync(
    expandGlob(
      "@fontsource*/*/files/*",
      {
        followSymlinks: true,
        root: path.join(rootPath, "node_modules"),
      },
    ),
  )
  const fontFilesMap = Object.fromEntries(fontFiles.map(({ name, path }) => [name, path]))

  return function fontsMiddleware(ctx) {
    if (!ctx.url.pathname.startsWith(hostedFontUrlPrefix)) {
      return ctx.next()
    }

    const fontFilePath = fontFilesMap[ctx.url.pathname.slice(hostedFontUrlPrefix.length)]
    if (fontFilePath === undefined) {
      throw new HttpError(404)
    }

    return serveFile(ctx.req, fontFilePath)
  }
}
