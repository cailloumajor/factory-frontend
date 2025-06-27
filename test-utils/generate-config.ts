import * as path from "@std/path"

// deno-lint-ignore verbatim-module-syntax
import denoJson from "../deno.json" with { type: "json" }

type DenoJson = typeof denoJson

async function main() {
  const srcPath = path.join(import.meta.dirname!, "..", "deno.json")
  const dstPath = path.join(import.meta.dirname!, "..", "deno-tests.json")

  const { mtime: srcMtime } = await Deno.stat(srcPath)
  let dstMtime: Date | null = null
  try {
    const { mtime } = await Deno.stat(dstPath)
    dstMtime = mtime
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err
    }
  }
  if (srcMtime && dstMtime && dstMtime > srcMtime) {
    // deno-lint-ignore no-console -- console is used by purpose.
    console.info("Testing configuration is up-to-date")
    return
  }

  const rawSrc = await Deno.readTextFile(srcPath)
  const config: DenoJson = JSON.parse(rawSrc)
  config.compilerOptions.jsx = "react-jsxdev"
  const rawDst = JSON.stringify(config)
  await Deno.writeTextFile(dstPath, rawDst)
  // deno-lint-ignore no-console -- console is used by purpose.
  console.info("Generated testing configuration")
}

if (import.meta.main) {
  await main()
}
