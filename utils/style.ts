import { expandGlob } from "@std/fs"
import { serveFile } from "@std/http"
import * as path from "@std/path"
import browserslist from "browserslist"
import { HttpError, type MiddlewareFn } from "fresh"
import type { FreshBuilder } from "fresh/dev"
import { browserslistToTargets, transform } from "lightningcss"
import { compile } from "sass"

const hostedFontUrlPrefix = "/hosted-fonts/"

export function styleTransformPlugin(builder: FreshBuilder, rootPath: string) {
  const nodeModulesDir = path.join(rootPath, "node_modules")

  builder.onTransformStaticFile(
    { pluginName: "styles", filter: /styles\.css$/ },
    (args) => {
      const compiled = compile(
        path.join(rootPath, "assets", "styles.scss"),
        {
          charset: false, // Bulma already includes @charset directives
          loadPaths: [nodeModulesDir],
        },
      )

      const targets = browserslistToTargets(browserslist(browserslist.defaults))
      const transformed = transform({
        code: new TextEncoder().encode(compiled.css),
        filename: path.basename(args.path),
        minify: args.mode === "production",
        targets,
        visitor: {
          Rule: {
            "font-face"(rule) {
              for (const prop of rule.value.properties) {
                if (prop.type !== "source") {
                  continue
                }
                for (const src of prop.value) {
                  const pathPrefix = "./files/"
                  if (src.type !== "url" || !src.value.url.url.startsWith(pathPrefix)) {
                    continue
                  }
                  src.value.url.url = src.value.url.url.replace(pathPrefix, hostedFontUrlPrefix)
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

export async function hostedFonts<T>(rootPath: string): Promise<MiddlewareFn<T>> {
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
